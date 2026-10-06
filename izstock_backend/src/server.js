const app = require('./app');
const config = require('./config');

app.listen(config.port, () =>{
    console.log(`IZStock API is listening on port ${config.port}`);
})