"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.botOptions = void 0;
const config_1 = require("@nestjs/config");
const telegraf_1 = require("telegraf");
const telegrafModuleOptions = (configService) => {
    const token = configService.get('TELEGRAM_TOKEN');
    if (!token) {
        throw new Error('TELEGRAM_TOKEN не задан');
    }
    return {
        token,
        middlewares: [(0, telegraf_1.session)()],
    };
};
const botOptions = () => {
    return {
        inject: [config_1.ConfigService],
        useFactory: (config) => telegrafModuleOptions(config),
    };
};
exports.botOptions = botOptions;
//# sourceMappingURL=bot.config.js.map