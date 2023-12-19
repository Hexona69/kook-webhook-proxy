import config from "./config/config.json";
import crypto from "crypto";
import express from "express";
import Logger from "bunyan";
import { ArrayElement, WebHook } from "./type";
import axios from "axios";
import bodyParser from "body-parser";

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

dotenvExpand.expand(dotenv.config());

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} ${JSON.stringify(req.body).length > 200 ? JSON.stringify(req.body).substring(0, 500) + "..." : JSON.stringify(req.body)}`);
    next();
});

function isChallengeEvent(
    event: WebHook.Events
): event is WebHook.ChallengeEvent {
    return event.d.channel_type == "WEBHOOK_CHALLENGE";
}

var BUNYAN_LOG_LEVEL: Logger.LogLevel, BUNYAN_ERROR_LEVEL: Logger.LogLevel;

switch (process.env.LOG_LEVEL?.toLowerCase()) {
    case "verbose":
    case "more":
    case "trace":
        BUNYAN_LOG_LEVEL = Logger.TRACE;
        break;
    case "debug":
        BUNYAN_LOG_LEVEL = Logger.DEBUG;
        break;
    case "less":
    case "warn":
        BUNYAN_LOG_LEVEL = Logger.WARN;
        break;
    default:
        BUNYAN_LOG_LEVEL = Logger.INFO;
}
switch (process.env.ERROR_LEVEL?.toLowerCase()) {
    case "verbose":
    case "more":
    case "info":
        BUNYAN_ERROR_LEVEL = Logger.INFO;
        break;
    case "less":
    case "error":
        BUNYAN_ERROR_LEVEL = Logger.ERROR;
        break;
    default:
        BUNYAN_ERROR_LEVEL = Logger.WARN;
}

const logger = new Logger({
    name: "kook-proxy",
    streams: [
        {
            stream: process.stdout,
            level: BUNYAN_LOG_LEVEL,
        },
        {
            stream: process.stderr,
            level: BUNYAN_ERROR_LEVEL,
        },
    ],
})

const bots = config.bots.filter(v => v.enable).map(v => {
    return {
        ...v,
        logger: new Logger({
            name: `${["kook-proxy", v.name].join(".")}`,
            streams: [
                {
                    stream: process.stdout,
                    level: BUNYAN_LOG_LEVEL,
                },
                {
                    stream: process.stderr,
                    level: BUNYAN_ERROR_LEVEL,
                },
            ],
        })
    }
})

app.get("/", (req, res) => {
    res.send({
        botCount: bots.length,
        detail: bots.map((bot => {
            return {
                name: bot.name
            }
        }))
    })
})

app.post("/", (req, res) => {
    const body = req.body;
    let encrypt;
    if (body && (encrypt = body.encrypt)) {
        const ret = bots.map((bot) => {
            try {
                const base64Content = body.encrypt;
                const base64Decode = Buffer.from(base64Content, "base64").toString(
                    "utf8"
                );
                const iv = base64Decode.substring(0, 16);
                const encrypt = base64Decode.substring(16);

                const encryptKey = bot.encryptKey.padEnd(32, "\0");
                const decipher = crypto.createDecipheriv("aes-256-cbc", encryptKey, iv);
                const decrypt = decipher.update(encrypt, "base64", "utf8") + decipher.final("utf8");
                return [bot, JSON.parse(decrypt)];
            } catch (e) {
                // bot.logger.error(e);
                return undefined;
            }
        }).find(v => v != undefined);
        if (ret) {
            const [bot, event] = ret;
            if (isChallengeEvent(event)) {
                res.send({
                    challenge: event.d.challenge,
                });
            } else {
                if (encrypt && bot.proxyEncrypted) sendBodyToRemote(bot.remoteAddress, { encrypt });
                else sendBodyToRemote(bot.remoteAddress, body);
            }
        }
    } else if (body && body.d) {
        const bot = bots.find((v) => {
            return v.verifyToken == body.d.verify_token;
        });
        if (bot) {
            const ret = handleBody(bot, req.body);
            if (ret) {
                res.send({
                    challenge: ret,
                });
            }
        }
    }
    res.end();
});

for (const bot of bots) {
    app.post(`/${bot.name}`, (req, res) => {
        const ret = handleBody(bot, req.body);
        if (ret) {
            res.send({
                challenge: ret,
            }).end();
        } else res.end();
    });
}

function handleBody(
    bot: ArrayElement<typeof bots>,
    body: any
) {
    let event = body, encrypt;
    if (encrypt = body.encrypt) {
        try {
            const base64Content = body.encrypt;
            const base64Decode = Buffer.from(base64Content, "base64").toString(
                "utf8"
            );
            const iv = base64Decode.substring(0, 16);
            const encrypt = base64Decode.substring(16);

            const encryptKey = bot.encryptKey.padEnd(32, "\0");
            const decipher = crypto.createDecipheriv("aes-256-cbc", encryptKey, iv);
            const decrypt = decipher.update(encrypt, "base64", "utf8") + decipher.final("utf8");
            event = JSON.parse(decrypt);
        } catch (e) {
            bot.logger.error(e);
            return undefined;
        }
    }
    if (event.d.verify_token == bot.verifyToken) {
        if (isChallengeEvent(event)) {
            return event.d.challenge;
        } else {
            if (encrypt && bot.proxyEncrypted) sendBodyToRemote(bot.remoteAddress, { encrypt });
            else sendBodyToRemote(bot.remoteAddress, event);
            if (bot.saveEvent) saveEvent(bot, event);
            return undefined;
        }
    } else {
        bot.logger.warn("Verify token dismatch!");
        bot.logger.warn(event);
        return undefined;
    }
}

function sendBodyToRemote(url: string, data: any) {
    axios.post(url, data).catch(() => { });
}

app.listen(config.port, () => {
    console.log(`Starts listening on ${config.port}`);
});

import fs from 'fs';
function saveEvent(bot: ArrayElement<typeof bots>, event: any) {
    try {
        fs.mkdirSync(`./config/event/${bot.name}`, { recursive: true });
        fs.writeFileSync(`./config/event/${bot.name}/${Date.now()}.json`, JSON.stringify(event));
    } catch (e) {
        bot.logger.error(`error while saving event for ${bot.name}`)
        bot.logger.error(e);
    }
}