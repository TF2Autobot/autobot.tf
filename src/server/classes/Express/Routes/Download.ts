import express, { Router } from 'express';
import Server from '../../Server';

export default class Download {
    constructor(private server: Server) {
        //
    }

    init(): Router {
        const router = express.Router();
        return router.get('/schema', (req, res) => {
            res.download(this.server.schemaManagerTF2.schemaPath);
        });
    }
}
