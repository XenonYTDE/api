import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000; // Use the PORT environment variable if available

// Middleware to parse JSON bodies
app.use(express.json());

// Determine the directory name from the URL of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the JSON file
const DATA_FILE = path.join(__dirname, 'data.json');

// Utility to read data from the file
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If the file does not exist, return a default value
        if (error.code === 'ENOENT') {
            return { messages: [] };
        } else {
            throw error;
        }
    }
}

// Utility to write data to the file
async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Initialize the data file
async function init() {
    try {
        await readData();
    } catch (error) {
        await writeData({ messages: [] }); // Initialize file with an empty structure
    }
}

// Middleware to log the real IP address of each request
app.use((req, res, next) => {
    const realIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`Incoming request from IP: ${realIp}`);
    next();
});

// Get all messages
app.get('/api/messages', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read messages' });
    }
});

// Post a new message
app.post('/api/messages', async (req, res) => {
    try {
        const data = await readData();
        const newMessage = {
            id: data.messages.length + 1,
            user: req.body.user,
            text: req.body.text,
            timestamp: new Date().toISOString()
        };
        data.messages.push(newMessage);
        await writeData(data);
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save the message' });
    }
});

// Delete a message by ID
app.delete('/api/messages/:id', async (req, res) => {
    try {
        const messageId = parseInt(req.params.id, 10);
        const data = await readData();
        const originalLength = data.messages.length;
        data.messages = data.messages.filter(message => message.id !== messageId);

        if (data.messages.length === originalLength) {
            return res.status(404).json({ error: 'Message not found' });
        }

        await writeData(data);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete the message' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Chat app listening on port ${port}`);
});

// Initialize the data file
init().catch(err => {
    console.error('Failed to initialize the data file', err);
});
