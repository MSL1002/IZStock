require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    dbPath: process.env.DB_PATH || 'data/izstock.db',
}