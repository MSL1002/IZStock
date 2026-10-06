const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
    it('returns ok', async () =>{
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('returns 404 for unknown routes', async() => {
        const res = await request(app).get('/api/thiswillfail');
        expect(res.status).toBe(404);
        expect(res.body.error).toBeDefined();
    });

    afterAll(() => require('../src/db'.close()));
});