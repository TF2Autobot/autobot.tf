// Temporary rate-limit implementation
// Reference: https://blog.logrocket.com/rate-limiting-node-js/

import { rateLimit } from 'express-rate-limit';

export const rateLimiterUsingThirdParty = rateLimit({
    windowMs: 1000, // 1 second
    max: 5, // Limit each IP to 5 requests per `windowMs`
    message: 'You have exceeded the 5 requests/second limit!',
    standardHeaders: 'draft-7',
    legacyHeaders: false
});
