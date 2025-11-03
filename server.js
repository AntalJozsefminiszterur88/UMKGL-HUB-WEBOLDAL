const app = require('./src/app');
const db = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await db.initializeDatabase();
        app.listen(PORT, () => {
            console.log(`A szerver sikeresen elindult és fut a http://localhost:${PORT} címen`);
        });
    } catch (err) {
        console.error('Nem sikerült elindítani a szervert:', err);
        process.exit(1);
    }
}

startServer();
