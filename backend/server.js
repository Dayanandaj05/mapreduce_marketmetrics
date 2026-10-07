const express = require('express');
const cors = require('cors');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: "ap-south-1" });
const BUCKET_NAME = "marketmetrics-datalake";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY || 'secret-demo-key';
const DATA_DIR = path.resolve(__dirname, '../data');
const BUCKET_DIR = path.resolve(__dirname, '../data/bucket');
const STATE_FILE = path.resolve(__dirname, '../data/job_state.json');

// Middleware to enforce API Key auth
const requireAuth = (req, res, next) => {
    const key = req.headers['x-api-key'] || req.query.key;
    if (key !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
};

app.use(requireAuth);

// Endpoint to list files
app.get('/api/files', async (req, res) => {
    try {
        const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
        const response = await s3.send(command);
        const files = (response.Contents || []).map(file => {
            const isEncrypted = file.Key.endsWith('.json'); // We simulated SSE for json
            return {
                name: file.Key,
                size: file.Size,
                modified: file.LastModified,
                encrypted: isEncrypted
            };
        });
        res.json({ files });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint to get metrics
app.get('/api/metrics', async (req, res) => {
    try {
        // Enforce IAM: backend can only read JSON (results), not CSV (raw)
        const listCommand = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
        const listResponse = await s3.send(listCommand);
        const files = (listResponse.Contents || []).filter(f => f.Key.endsWith('.json')).sort((a,b) => a.Key.localeCompare(b.Key));
        
        if (files.length === 0) {
            return res.status(404).json({ error: 'No processed results found.' });
        }
        
        const latestFile = files[files.length - 1];
        
        const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: latestFile.Key });
        const getResponse = await s3.send(getCommand);
        const rawContentString = await getResponse.Body.transformToString();
        const rawContent = JSON.parse(rawContentString);
        
        if (!rawContent.__SSE_S3_ENCRYPTED__) {
             return res.status(500).json({ error: 'Data at rest is not encrypted.'});
        }
        
        // Decrypt payload
        const decoded = Buffer.from(rawContent.data, 'base64').toString('utf8');
        res.json(JSON.parse(decoded));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint to trigger fresh pipeline
app.post('/api/trigger', (req, res) => {
    res.json({ status: 'started' });
    
    // Clear old state
    fs.writeFileSync(STATE_FILE, JSON.stringify({status: 'IDLE', timestamp: new Date().toISOString()}));
    
    // Run generation then mapreduce
    const scriptPath = path.resolve(__dirname, '../data/generate_mock_data.py');
    const runnerPath = path.resolve(__dirname, '../pipeline/job_runner.py');
    
    console.log("Triggering fresh dataset generation...");
    exec(`python3 ${scriptPath}`, (err, stdout, stderr) => {
        if (err) console.error("Error generating data:", err);
        else {
            console.log("Data generation complete. Firing event...");
            exec(`python3 ${runnerPath} ${path.join(BUCKET_DIR, 'raw_transactions.csv')}`);
        }
    });
});

// SSE Endpoint for job status
app.get('/api/lifecycle/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendState = () => {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf8');
            res.write(`data: ${data}\n\n`);
        }
    };
    
    // Send initial state
    sendState();
    
    // Watch for changes
    const watcher = chokidar.watch(STATE_FILE, { persistent: true });
    watcher.on('change', sendState);
    
    req.on('close', () => {
        watcher.close();
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
});
