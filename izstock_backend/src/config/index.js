require('dotenv').config();

module.exports = {
    public_port: process.env.PUBLIC_PORT || 3000,
    private_port: process.env.PRIVATE_PORT || 4000,
    dbPath: process.env.DB_PATH || 'data/izstock.db',
}