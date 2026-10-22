const request = require('supertest');
const app = require('../apps/private');

describe('GET /health', () => {
    it('returns ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('returns 404 with the error envelope for unknown routes', async () => {
        const res = await request(app).get('/thiswillfail');
        expect(res.status).toBe(404);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe('NOT_FOUND');
    });
});