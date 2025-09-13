"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotUpdate = void 0;
const nestjs_telegraf_1 = require("nestjs-telegraf");
const telegraf_1 = require("telegraf");
const user_service_1 = require("../user/user.service");
const user_schema_1 = require("../schemas/user.schema");
const group_service_1 = require("../group/group.service");
const requisite_service_1 = require("../requisite/requisite.service");
const common_1 = require("@nestjs/common");
const operator_guard_1 = require("../common/guards/operator.guard");
const withdraw_service_1 = require("../withdraw/withdraw.service");
const mongoose_1 = require("mongoose");
const operation_schema_1 = require("../schemas/operation.schema");
const operation_service_1 = require("../operation/operation.service");
const withdraw_schema_1 = require("../schemas/withdraw.schema");
const admin_guard_1 = require("../common/guards/admin.guard");
const session_actions_const_1 = require("../common/consts/session-actions.const");
const format_account_1 = require("../common/helpers/format-account");
let BotUpdate = class BotUpdate {
    constructor(userService, groupService, requisiteService, withdrawService, operationService, bot) {
        this.userService = userService;
        this.groupService = groupService;
        this.requisiteService = requisiteService;
        this.withdrawService = withdrawService;
        this.operationService = operationService;
        this.bot = bot;
    }
    async start(ctx) {
        const user = await this.userService.findOrCreateUser({
            telegram_id: ctx.from.id,
            username: ctx.from.username,
            first_name: ctx.from.first_name,
        });
        await ctx.reply(`Добро пожаловать, ${user.username || user.first_name}!`);
    }
    getRoleMenu(role) {
        const buttons = [];
        if (role === user_schema_1.UserRole.ADMIN) {
        }
        if (role === user_schema_1.UserRole.OPERATOR) {
        }
        return telegraf_1.Markup.keyboard(buttons, { columns: 2 }).resize();
    }
    async handleGroupAdded(ctx) {
        var _a;
        const botMember = (_a = ctx.message['new_chat_members']) === null || _a === void 0 ? void 0 : _a.find((m) => m.id === ctx.botInfo.id);
        if (botMember && ctx.chat.type !== 'private') {
            try {
                const existingGroup = await this.groupService.findByTelegramId(ctx.chat.id);
                if (existingGroup) {
                    await ctx.reply('ℹ️ Эта группа уже зарегистрирована!');
                    return;
                }
                const admin = await this.userService.getUserByTelegramId(ctx.from.id);
                if (admin.role !== user_schema_1.UserRole.ADMIN) {
                    await ctx.reply('❌ Только администраторы могут регистрировать группы!');
                    await ctx.leaveChat();
                    return;
                }
                const group = await this.groupService.createOrUpdateGroup({
                    telegram_group_id: ctx.chat.id,
                    title: ctx.chat.title || `Группа ${ctx.chat.id}`,
                });
                await ctx.reply(`✅ Группа зарегистрирована!`);
            }
            catch (e) {
                await ctx.reply(`❌ Ошибка регистрации: ${e.message}`);
                await ctx.leaveChat();
            }
        }
    }
    async handlePhoto(ctx) {
        if (ctx.chat.type === 'private') {
            return this.handleWithdrawChecks(ctx);
        }
        else {
            return this.handleGroupCheckPhoto(ctx);
        }
    }
    async handleDocument(ctx) {
        const document = ctx.message['document'];
        if (!document)
            return;
        if (document.mime_type === 'application/pdf') {
            return this.handleGroupCheckDocument(ctx);
        }
        else {
            await ctx.reply('Пожалуйста, отправьте PDF-файл 📄');
        }
    }
    async handleGroupCheckDocument(ctx) {
        try {
            const document = ctx.message['document'];
            if (!document || document.mime_type !== 'application/pdf') {
                await ctx.reply('Пожалуйста, отправьте PDF-файл чека 📄');
                return;
            }
            const group = await this.groupService.findByTelegramId(ctx.chat.id);
            if (!group) {
                await ctx.reply('Группа не зарегистрирована!');
                return;
            }
            const operators = await this.userService.findOperatorsByGroupId(group._id);
            if (!operators || operators.length === 0) {
                await ctx.reply('Нет операторов, привязанных к этой группе!');
                return;
            }
            const originalMessageId = ctx.message.message_id;
            const processingMessage = await ctx.reply('⏳ Обработка PDF-чека...', {
                reply_parameters: { message_id: originalMessageId },
            });
            for (const operator of operators) {
                const caption = `Новый PDF-чек из группы: ${group.title}`;
                const operation = await this.operationService.create({
                    group_id: group._id,
                    group_chat_id: ctx.chat.id,
                    original_message_id: originalMessageId,
                    group_message_id: processingMessage.message_id,
                    operator_id: operator._id,
                    document_file_id: document.file_id,
                    status: operation_schema_1.OperationStatuses.PENDING,
                });
                await ctx.telegram.sendDocument(operator.telegram_id, document.file_id, {
                    caption,
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        telegraf_1.Markup.button.callback('Подтвердить', `select_req_${operation._id}`),
                        telegraf_1.Markup.button.callback('Отклонить', `reject_check_${operation._id}`),
                    ]).reply_markup,
                });
            }
        }
        catch (e) {
            await ctx.reply(`Ошибка обработки PDF-чека: ${e.message}`);
        }
    }
    async handleWithdrawChecks(ctx) {
        const session = ctx['session'];
        if (!session || session.action !== 'AWAITING_WITHDRAW_CHECKS')
            return;
        if (!session.checks)
            session.checks = [];
        const photo = ctx.message['photo'][ctx.message['photo'].length - 1];
        session.checks.push(photo.file_id);
        if (session.checks.length === 2) {
            try {
                const operator = await this.userService.findById(session.operatorId);
                const requisite = await this.requisiteService.findById(session.requisiteId);
                const request = await this.withdrawService.create({
                    operator: operator._id,
                    target_type: 'OPERATOR',
                    amount: session.withdrawAmount,
                    requisite: requisite._id,
                    status: withdraw_schema_1.WithdrawStatuses.PENDING,
                });
                const mediaGroup = session.checks.map((fileId) => ({
                    type: 'photo',
                    media: fileId,
                }));
                await this.notifyAdmins(request, operator, requisite, mediaGroup);
                await ctx.reply('✅ Чеки отправлены администраторам. Ожидайте подтверждения.');
                ctx['session'] = null;
            }
            catch (e) {
                await ctx.reply(`❌ Ошибка отправки чеков: ${e.message}`);
            }
        }
        else {
            await ctx.reply(`✅ Чек получен (${session.checks.length}/2)`);
        }
    }
    async handleGroupCheckPhoto(ctx) {
        try {
            const group = await this.groupService.findByTelegramId(ctx.chat.id);
            if (!group) {
                await ctx.reply('Группа не зарегистрирована!');
                return;
            }
            const operators = await this.userService.findOperatorsByGroupId(group._id);
            if (!operators || operators.length === 0) {
                await ctx.reply('Нет операторов, привязанных к этой группе!');
                return;
            }
            const originalMessageId = ctx.message.message_id;
            const processingMessage = await ctx.reply('⏳ Обработка чека...', {
                reply_parameters: {
                    message_id: originalMessageId,
                },
            });
            const photo = ctx.message['photo'][ctx.message['photo'].length - 1];
            for (const operator of operators) {
                const caption = `Новый чек из группы: ${group.title}`;
                const operation = await this.operationService.create({
                    group_id: group._id,
                    group_chat_id: ctx.chat.id,
                    original_message_id: originalMessageId,
                    group_message_id: processingMessage.message_id,
                    operator_id: operator._id,
                    photo_file_id: photo.file_id,
                    status: operation_schema_1.OperationStatuses.PENDING,
                });
                await ctx.telegram.sendPhoto(operator.telegram_id, photo.file_id, {
                    caption,
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        telegraf_1.Markup.button.callback('Подтвердить', `select_req_${operation._id}`),
                        telegraf_1.Markup.button.callback('Отклонить', `reject_check_${operation._id}`),
                    ]).reply_markup,
                });
            }
        }
        catch (e) {
            await ctx.reply(`Ошибка обработки чека: ${e.message}`);
        }
    }
    async handleSelectRequisite(ctx) {
        try {
            const operationId = ctx.match[1];
            const operation = await this.operationService.findPendingOperationById(operationId);
            if (!operation) {
                await ctx.answerCbQuery('Операция устарела или не найдена');
                return;
            }
            const operator = await this.userService.findById(operation.operator_id);
            const requisites = await this.requisiteService.getActiveRequisitesForOperator(operator._id);
            if (!requisites || requisites.length === 0) {
                await ctx.editMessageReplyMarkup(undefined);
                await ctx.reply('⚠️ У вас нет активных реквизитов для этой группы');
                await ctx.answerCbQuery();
                return;
            }
            const keyboard = requisites.map((req) => [
                telegraf_1.Markup.button.callback(`${req.name} (${(0, format_account_1.formatAccountNumber)(req.account_number, req.type)})`, `request_amount_${operationId}_${req._id}`),
            ]);
            await ctx.editMessageReplyMarkup({
                inline_keyboard: keyboard,
            });
            await ctx.answerCbQuery();
        }
        catch (e) {
            await ctx.answerCbQuery('Ошибка выбора реквизита');
            await ctx.reply(`Ошибка: ${e.message}`);
        }
    }
    async requestAmount(ctx) {
        const operationId = ctx.match[1];
        const requisiteId = new mongoose_1.Types.ObjectId(ctx.match[2]);
        try {
            const operation = await this.operationService.findPendingOperationById(operationId);
            await this.operationService.update(operationId, {
                requisite_id: requisiteId,
            });
            ctx['session'] = {
                action: session_actions_const_1.SessionAction.AwaitingCheckAmount,
                operationId,
                requisiteId,
                groupId: operation.group_id,
                groupChatId: operation.group_chat_id,
                groupMessageId: operation.group_message_id,
                originalMessageId: operation.original_message_id,
            };
            await ctx.answerCbQuery();
            await ctx.editMessageReplyMarkup(undefined);
            await ctx.reply('Введите сумму для зачисления:');
        }
        catch (e) {
            await ctx.answerCbQuery('Ошибка обработки операции');
            await ctx.reply(`Ошибка: ${e.message}`);
        }
    }
    async cancelAmountInput(ctx) {
        ctx['session'] = null;
        await ctx.reply('❌ Отменено', telegraf_1.Markup.removeKeyboard());
    }
    async rejectCheck(ctx) {
        var _a;
        const operationId = ctx.match[1];
        try {
            const operation = await this.operationService.findPendingOperationById(operationId);
            if (!operation) {
                await ctx.answerCbQuery('Операция устарела или не найдена');
                return;
            }
            await ctx.telegram.editMessageText(operation.group_chat_id, operation.group_message_id, undefined, '❌ Чек отклонен');
            await ctx.telegram.setMessageReaction(operation.group_chat_id, operation.original_message_id, [
                {
                    type: 'emoji',
                    emoji: '👎',
                },
            ]);
            await this.operationService.reject(operationId);
            await ctx.answerCbQuery();
            await ctx.editMessageReplyMarkup(undefined);
            await ctx.telegram.setMessageReaction(ctx.chat.id, ctx.callbackQuery.message.message_id, [
                {
                    type: 'emoji',
                    emoji: '👎',
                },
            ]);
            await ctx.reply('Чек отклонен', {
                reply_parameters: {
                    message_id: (_a = ctx.callbackQuery.message) === null || _a === void 0 ? void 0 : _a.message_id,
                },
            });
        }
        catch (e) {
            await ctx.answerCbQuery('Ошибка при отклонении чека');
            await ctx.reply(`Ошибка: ${e.message}`);
        }
    }
    async showMyRequisites(ctx) {
        const operator = await this.userService.getUserByTelegramId(ctx.from.id);
        const requisites = await this.requisiteService.findByOperator(operator._id);
        let message = '📋 Ваши реквизиты:\n\n';
        requisites.forEach((req) => {
            message += `▫️ ${req.name} (${req.type})\n`;
            message += `${req.owner && req.owner} \n`;
            message += `Номер: ${(0, format_account_1.formatAccountNumber)(req.account_number, req.type)}\n`;
            message += `Баланс: ${req.balance}\n\n`;
        });
        await ctx.reply(message);
    }
    async showMyBalance(ctx) {
        const operator = await this.userService.getUserByTelegramId(ctx.from.id);
        const balance = await this.userService.getOperatorBalance(operator._id);
        await ctx.reply(`💰 Ваш текущий баланс: ${balance}`);
    }
    async listReq(ctx) {
        const groups = await this.groupService.findAll();
        const buttons = groups.length
            ? groups.map((group) => [
                telegraf_1.Markup.button.callback(`${group.title}`, `select_operators_${group._id}`),
            ])
            : [[telegraf_1.Markup.button.callback('Нет групп', 'nooo')]];
        await ctx.reply('Выберете группу:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async selectOperators(ctx) {
        const groupId = ctx.match[1];
        const operators = await this.userService.findOperatorsByGroupId(groupId);
        const buttons = operators.map((op) => [
            telegraf_1.Markup.button.callback(op.username, `select_op_req_${op._id}`),
        ]);
        await ctx.editMessageText('Выберите оператора:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async selectRequisite(ctx) {
        const operatorId = ctx.match[1];
        const operator = await this.userService.findById(new mongoose_1.Types.ObjectId(operatorId));
        const requisites = await this.requisiteService.findByIds(operator.requisites);
        const buttons = requisites.map((req) => [
            telegraf_1.Markup.button.callback(`${req.name} ${req.balance} ${req.is_active ? '🟢' : '🔴'}`, `toggle_req_${req._id}_op_${operatorId}`),
        ]);
        await ctx.editMessageText('Реквизиты оператора (нажмите, чтобы переключить активность):', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async toggleRequisite(ctx) {
        const requisiteId = ctx.match[1];
        const operatorId = ctx.match[2];
        await this.requisiteService.toggleActive(requisiteId);
        const operator = await this.userService.findById(new mongoose_1.Types.ObjectId(operatorId));
        const requisites = await this.requisiteService.findByIds(operator.requisites);
        const buttons = requisites.map((req) => [
            telegraf_1.Markup.button.callback(`${req.name} ${req.balance} ${req.is_active ? '🟢' : '🔴'}`, `toggle_req_${req._id}_op_${operatorId}`),
        ]);
        buttons.push([
            telegraf_1.Markup.button.callback('💾 Сохранить', `save_requisites_op_${operatorId}`),
        ]);
        await ctx.editMessageText('Реквизиты оператора (нажмите, чтобы переключить активность):', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async saveRequisites(ctx) {
        const operatorId = ctx.match[1];
        const operator = await this.userService.findById(new mongoose_1.Types.ObjectId(operatorId));
        const groupsData = await this.groupService.getGroupsWithActiveRequisites(operator.groups);
        for (const group of groupsData) {
            let message = `📋 Актуальные реквизиты в группе "${group.title}":\n`;
            for (const operator of group.operators) {
                if (operator.active_requisites.length > 0) {
                    for (const req of operator.active_requisites) {
                        message += `• ${(req === null || req === void 0 ? void 0 : req.owner) || req.name} ${req.account_number}\n`;
                        if (req.description) {
                            message += `${req.description}\n`;
                        }
                    }
                }
            }
            if (message.trim() === `📋 Актуальные реквизиты в группе "${group.title}":`) {
                message += '\n⚠️ Нет активных реквизитов.';
            }
            await ctx.telegram.sendMessage(group.telegram_group_id, message);
        }
        await ctx.answerCbQuery('Реквизиты сохранены и отправлены в группы ✅');
    }
    async handleWithdrawGroupBalanceCommand(ctx) {
        if (ctx.chat.type === 'private') {
            await ctx.reply('❌ Эта команда работает только в группе!');
            return;
        }
        try {
            const group = await this.groupService.findByTelegramId(ctx.chat.id);
            if (!group) {
                await ctx.reply('❌ Группа не зарегистрирована!');
                return;
            }
            const userId = ctx.from.id;
            const isAdmin = await this.isUserGroupAdmin(ctx, userId);
            if (!isAdmin) {
                await ctx.reply('❌ Только администраторы группы могут инициировать вывод баланса');
                return;
            }
            if (group.balance <= 0) {
                await ctx.reply('❌ Баланс группы равен нулю или отрицательный. Вывод невозможен.');
                return;
            }
            const user = await this.userService.findByTelegramId(userId);
            const request = await this.withdrawService.create({
                target_type: 'GROUP',
                amount: group.balance,
                status: withdraw_schema_1.WithdrawStatuses.PENDING,
                group: group._id,
            });
            const adminMessage = [
                `🚨 Запрос на вывод ВСЕГО баланса группы!`,
                `👥 Группа: ${group.title}`,
                `👤 Инициатор: @${user.username}`,
                `💰 Сумма: ${group.balance}`,
                `🆔 ID запроса: ${request._id}`,
            ].join('\n');
            const keyboard = telegraf_1.Markup.inlineKeyboard([
                [
                    telegraf_1.Markup.button.callback('✅ Подтвердить', `approve_group_withdraw_${request._id}`),
                    telegraf_1.Markup.button.callback('❌ Отклонить', `reject_group_withdraw_${request._id}`),
                ],
            ]);
            const admins = await this.userService.getAdmins();
            await Promise.all(admins.map((admin) => this.bot.telegram.sendMessage(admin.telegram_id, adminMessage, {
                reply_markup: keyboard.reply_markup,
            })));
            await ctx.reply(`✅ Запрос на вывод всего баланса (${group.balance} ) отправлен администраторам. Ожидайте подтверждения.`, { reply_parameters: { message_id: ctx.message.message_id } });
        }
        catch (e) {
            await ctx.reply(`❌ Ошибка: ${e.message}`);
        }
    }
    async isUserGroupAdmin(ctx, userId) {
        try {
            const administrators = await ctx.getChatAdministrators();
            return administrators.some((admin) => admin.user.id === userId);
        }
        catch (e) {
            console.error('Ошибка при получении администраторов группы:', e);
            return false;
        }
    }
    async handleApproveGroupWithdraw(ctx) {
        try {
            const requestId = ctx.match[1];
            const admin = await this.userService.findByTelegramId(ctx.from.id);
            if (!admin || admin.role !== user_schema_1.UserRole.ADMIN) {
                await ctx.answerCbQuery('❌ Только для администраторов');
                return;
            }
            const request = await this.withdrawService.findById(requestId);
            if (!request) {
                throw new Error('Запрос на вывод не найден');
            }
            if (request.status !== withdraw_schema_1.WithdrawStatuses.PENDING) {
                await ctx.answerCbQuery('Операция устарела или не найдена');
                return;
            }
            const group = await this.groupService.findById(request.group);
            if (group.balance < request.amount) {
                throw new Error('Недостаточно средств на балансе группы');
            }
            await this.groupService.updateBalance(group._id, -request.amount);
            await this.withdrawService.approve(requestId, admin._id);
            const initiator = await this.userService.findById(admin._id);
            await this.bot.telegram.sendMessage(initiator.telegram_id, `✅ Ваш запрос на вывод баланса группы ${group.title} подтвержден!\n` +
                `💰 Сумма: ${request.amount} \n` +
                `🆔 ID запроса: ${request._id}`);
            await ctx.editMessageText(`✅ Запрос #${requestId} подтвержден\n` +
                `👥 Группа: ${group.title}\n` +
                `💰 Сумма: ${request.amount} \n` +
                `👤 Инициатор: @${initiator.username}`);
            await ctx.answerCbQuery('✅ Вывод подтвержден');
        }
        catch (e) {
            await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`);
        }
    }
    async handleRejectGroupWithdraw(ctx) {
        try {
            const requestId = ctx.match[1];
            const admin = await this.userService.findByTelegramId(ctx.from.id);
            if (!admin || admin.role !== user_schema_1.UserRole.ADMIN) {
                await ctx.answerCbQuery('❌ Только для администраторов');
                return;
            }
            const request = await this.withdrawService.findById(requestId);
            if (!request) {
                throw new Error('Запрос на вывод не найден');
            }
            await this.withdrawService.reject(requestId, admin._id);
            const initiator = await this.userService.findById(admin._id);
            const group = await this.groupService.findById(request.group);
            await this.bot.telegram.sendMessage(initiator.telegram_id, `❌ Ваш запрос на вывод ${request.amount}  из группы ${group.title} отклонен.\n` +
                `🆔 ID запроса: ${request._id}`);
            await ctx.editMessageText(`❌ Запрос #${requestId} отклонен\n` +
                `👥 Группа: ${group.title}\n` +
                `💰 Сумма: ${request.amount} \n` +
                `👤 Инициатор: @${initiator.username}`);
            await ctx.answerCbQuery('❌ Вывод отклонен');
        }
        catch (e) {
            console.log(e.message);
            await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`);
        }
    }
    async handleRejectWithdraw(ctx) {
        try {
            await ctx.answerCbQuery();
            const admin = await this.userService.getUserByTelegramId(ctx.from.id);
            if (!admin || admin.role !== user_schema_1.UserRole.ADMIN) {
                await ctx.reply('❌ Только для администраторов');
                return;
            }
            const request = await this.withdrawService.findById(ctx.match[1]);
            if (request.status !== 'PENDING') {
                await ctx.answerCbQuery('Операция устарела или не найдена');
                return;
            }
            const updatedRequest = await this.withdrawService.reject(ctx.match[1], admin._id.toString());
            const operator = await this.userService.findById(request.operator);
            await this.bot.telegram.sendMessage(operator.telegram_id, `❌ Ваш запрос на вывод ${request.amount}  отклонен`);
            await ctx.editMessageText(`❌ Запрос #${ctx.match[1]} отклонен`, {
                reply_markup: { inline_keyboard: [] },
            });
        }
        catch (e) {
            console.error('Ошибка отклонения:', e);
            await ctx.answerCbQuery(`❌ ${e.message}`);
        }
    }
    async handlePendingCommand(ctx) {
        if (ctx.chat.type !== 'private')
            return;
        try {
            const operatorTelegramId = ctx.from.id;
            const operator = await this.userService.findByTelegramId(operatorTelegramId);
            const pendingOperations = await this.operationService.findPending(operator._id);
            if (pendingOperations.length === 0) {
                await ctx.reply('У вас нет необработанных чеков');
                return;
            }
            const buttons = pendingOperations.map((op) => [
                telegraf_1.Markup.button.callback(`Открыть чек #${op._id}`, `open_check_${op._id}`),
            ]);
            await ctx.reply('📋 Необработанные чеки:', telegraf_1.Markup.inlineKeyboard(buttons));
        }
        catch (e) {
            await ctx.reply(`Ошибка получения списка чеков: ${e.message}`);
        }
    }
    async handleOpenCheck(ctx) {
        const operationId = ctx.match[1];
        const operation = await this.operationService.findById(operationId);
        if (!operation) {
            await ctx.answerCbQuery('Чек не найден');
            return;
        }
        const caption = `🧾 Чек #${operation._id}\n Дата: ${new Date(operation.created_at).toLocaleString()}`;
        if (operation === null || operation === void 0 ? void 0 : operation.document_file_id) {
            await ctx.replyWithDocument(operation.document_file_id, {
                caption,
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    telegraf_1.Markup.button.callback('Подтвердить', `select_req_${operation._id}`),
                    telegraf_1.Markup.button.callback('Отклонить', `reject_check_${operation._id}`),
                ]).reply_markup,
            });
            return;
        }
        await ctx.replyWithPhoto(operation.photo_file_id, {
            caption,
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                telegraf_1.Markup.button.callback('✅ Подтвердить', `select_req_${operation._id}`),
                telegraf_1.Markup.button.callback('❌ Отклонить', `reject_check_${operation._id}`),
            ]).reply_markup,
        });
        await ctx.answerCbQuery();
    }
    async notifyAdmins(request, operator, requisite, mediaGroup) {
        const admins = await this.userService.getAdmins();
        const message = [
            `🚨 Новый запрос на вывод!`,
            `Оператор: @${operator.username}`,
            `Сумма: ${request.amount}`,
            `Реквизит: ${requisite.name}`,
            `ID: ${request._id}`,
        ].join('\n');
        const confirmData = `CONFIRM_ADMIN_WITHDRAW_${request._id}`;
        const rejectData = `reject_withdraw_${request._id}`;
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            [
                telegraf_1.Markup.button.callback('✅ Подтвердить', confirmData),
                telegraf_1.Markup.button.callback('❌ Отклонить', rejectData),
            ],
        ]).reply_markup;
        await Promise.all(admins.map(async (admin) => {
            try {
                await this.bot.telegram.sendMediaGroup(admin.telegram_id, mediaGroup);
                await this.bot.telegram.sendMessage(admin.telegram_id, message, {
                    reply_markup: keyboard,
                });
            }
            catch (e) {
                console.error(`Ошибка отправки админу ${admin.telegram_id}:`, e.message);
            }
        }));
    }
    async handleConfirmWithdraw(ctx) {
        const [withdrawId] = ctx.match.slice(1);
        const withdraw = await this.withdrawService.findById(withdrawId);
        if (withdraw.status === withdraw_schema_1.WithdrawStatuses.APPROVED) {
            await ctx.answerCbQuery('Операция устарела или не найдена');
            return;
        }
        ctx['session'] = {
            action: session_actions_const_1.SessionAction.AdminConfirmWithdraw,
            withdrawId,
            operatorId: withdraw.operator,
            operatorRequisiteId: withdraw.requisite,
        };
        await ctx.reply('Введите сумму в USDT:');
    }
    async handleText(ctx, next) {
        if (!('text' in ctx.message))
            return next();
        if (ctx.updateType === 'callback_query')
            return next();
        const session = ctx['session'];
        if (session === null || session === void 0 ? void 0 : session.creatingRequisite) {
            const type = session.creatingRequisite.type;
            const text = ctx.message.text.trim();
            try {
                if (type === 'card') {
                    const parts = text.split(' ');
                    const cardIndex = parts.findIndex((p) => /^\d{12,20}$/.test(p));
                    if (cardIndex === -1 || cardIndex < 2) {
                        await ctx.reply('❌ Неверный формат. Убедитесь, что вы ввели:\n<Название> <ФИО> <Карта> <Описание>');
                        return;
                    }
                    const name = parts[0];
                    const owner = parts.slice(1, cardIndex).join(' ');
                    const account_number = parts[cardIndex];
                    const description = parts.slice(cardIndex + 1).join(' ') || null;
                    await this.requisiteService.create({
                        name,
                        owner,
                        account_number,
                        description,
                        type: session.creatingRequisite.type,
                        is_active: false,
                    });
                    await ctx.reply('✅ Реквизит успешно создан!');
                    return;
                }
                if (type === 'wallet') {
                    const parts = text.split(' ');
                    if (parts.length < 2) {
                        await ctx.reply('❌ Неверный формат. Убедитесь, что вы ввели:\n<Название> <Номер_кошелька> <Описание>');
                        return;
                    }
                    const name = parts[0];
                    const account_number = parts[1];
                    const description = parts.slice(2).join(' ') || null;
                    await this.requisiteService.create({
                        name,
                        owner: null,
                        account_number,
                        description,
                        type: session.creatingRequisite.type,
                        is_active: false,
                    });
                    await ctx.reply('✅ Реквизит успешно создан!');
                    return;
                }
            }
            catch (e) {
                await ctx.reply(e.message);
            }
        }
        if ((session === null || session === void 0 ? void 0 : session.action) === session_actions_const_1.SessionAction.AwaitingCheckAmount &&
            ctx.chat.type === 'private') {
            try {
                const amount = Number(ctx.message.text.replace(',', '.'));
                if (isNaN(amount) || amount <= 0) {
                    throw new Error('Некорректная сумма');
                }
                const { groupId, requisiteId, groupChatId, groupMessageId } = session;
                const requisite = await this.requisiteService.findById(requisiteId);
                if (!(requisite === null || requisite === void 0 ? void 0 : requisite.operator_id)) {
                    throw new Error('Реквизит не привязан к оператору');
                }
                await Promise.all([
                    this.groupService.updateBalance(groupId, amount),
                    this.requisiteService.updateBalance(requisiteId, amount),
                ]);
                await ctx.telegram.editMessageText(groupChatId, groupMessageId, undefined, `✅ Подтвержденная сумма: ${amount}`);
                await ctx.telegram.setMessageReaction(groupChatId, session.originalMessageId, [
                    {
                        type: 'emoji',
                        emoji: '👍',
                    },
                ]);
                await this.operationService.approve(session.operationId);
                await ctx.reply(`✅ Чек подтвержден! Начислено: ${amount}`, telegraf_1.Markup.removeKeyboard());
                ctx['session'] = null;
            }
            catch (e) {
                await ctx.reply(`❌ Ошибка: ${e.message}\nПопробуйте снова:`);
            }
            return;
        }
        if ((session === null || session === void 0 ? void 0 : session.action) === session_actions_const_1.SessionAction.AdminConfirmWithdraw &&
            ctx.chat.type === 'private') {
            try {
                const admin = await this.userService.getUserByTelegramId(ctx.from.id);
                if (!admin || admin.role !== user_schema_1.UserRole.ADMIN) {
                    await ctx.reply('❌ Только для администраторов');
                    return;
                }
                const rawUsdAmount = ctx.message.text.replace(',', '.');
                let usdAmount = parseFloat(rawUsdAmount);
                if (isNaN(usdAmount)) {
                    throw new Error('Некорректная сумма USD');
                }
                usdAmount = Math.round(usdAmount * 100) / 100;
                const withdrawId = session.withdrawId;
                const operatorId = session.operatorId;
                const operatorRequisiteId = session.operatorRequisiteId;
                const request = await this.withdrawService.findById(withdrawId);
                if (!request) {
                    throw new Error('Запрос на вывод не найден');
                }
                const updatedRequest = await this.withdrawService.approve(withdrawId, admin._id, usdAmount);
                await this.requisiteService.decreaseRequisiteBalance(operatorRequisiteId, request.amount);
                const operator = await this.userService.findById(operatorId);
                const requisite = await this.requisiteService.findById(operatorRequisiteId);
                await this.bot.telegram.sendMessage(operator.telegram_id, `✅ Вывод средств завершен!\n` +
                    `📤 Сумма: ${request.amount}\n` +
                    `💸 Конвертировано: ${usdAmount} USDT\n`);
                await ctx.reply(`✅ Вывод подтвержден! Оператор уведомлен.`);
                ctx['session'] = null;
            }
            catch (e) {
                await ctx.reply(`❌ Ошибка: ${e.message}\nПопробуйте снова:`);
            }
            return;
        }
        if ((session === null || session === void 0 ? void 0 : session.action) === session_actions_const_1.SessionAction.WithdrawAmount &&
            ctx.chat.type === 'private') {
            try {
                const id = ctx.from.id;
                const amount = Number(ctx.message['text']);
                if (isNaN(amount) || amount <= 0) {
                    throw new Error('Некорректная сумма');
                }
                const operator = await this.userService.findByTelegramId(id);
                const requisite = await this.requisiteService.findById(session.requisiteId);
                if (requisite.operator_id.toString() !== operator.id) {
                    throw new Error('Реквизит не принадлежит оператору');
                }
                if (requisite.balance < amount) {
                    throw new Error(`Недостаточно средств. Доступно: ${requisite.balance}`);
                }
                const cryptoRequisites = await this.requisiteService.getCryptoRequisites();
                if (cryptoRequisites.length === 0) {
                    throw new Error('Нет доступных крипто-реквизитов');
                }
                let message = `Для вывода ${amount}  отправьте средства на:\n\n`;
                cryptoRequisites.forEach((req, index) => {
                    message += `Реквизит ${index + 1}: ${req.account_number}\n`;
                });
                message += `\nПосле отправки пришлите 2 чека транзакций в ответ на это сообщение!`;
                ctx['session'] = {
                    action: 'AWAITING_WITHDRAW_CHECKS',
                    withdrawAmount: amount,
                    cryptoRequisites: cryptoRequisites.map((r) => r.account_number),
                    operatorId: operator._id,
                    requisiteId: requisite._id,
                    originalMessage: ctx.message.message_id + 1,
                };
                await ctx.reply(message, {
                    reply_markup: { remove_keyboard: true },
                });
            }
            catch (e) {
                await ctx.reply(`❌ Ошибка: ${e.message}\nПопробуйте снова:`);
            }
            return;
        }
        return next();
    }
    async handleMigrate(ctx) {
        const message = ctx.message;
        if (message === null || message === void 0 ? void 0 : message.migrate_to_chat_id) {
            const oldChatId = message.chat.id;
            const newChatId = message.migrate_to_chat_id;
            await this.groupService.updateChatId(oldChatId, newChatId);
            await ctx.reply(`Группа была обновлена до супергруппы. Обновил chatId: ${newChatId}`);
        }
    }
};
exports.BotUpdate = BotUpdate;
__decorate([
    (0, nestjs_telegraf_1.Command)('start'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "start", null);
__decorate([
    (0, nestjs_telegraf_1.On)('new_chat_members'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleGroupAdded", null);
__decorate([
    (0, nestjs_telegraf_1.On)('photo'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handlePhoto", null);
__decorate([
    (0, nestjs_telegraf_1.On)('document'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleDocument", null);
__decorate([
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleGroupCheckDocument", null);
__decorate([
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleWithdrawChecks", null);
__decorate([
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleGroupCheckPhoto", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^select_req_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleSelectRequisite", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^request_amount_(.+)_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "requestAmount", null);
__decorate([
    (0, nestjs_telegraf_1.Hears)('🚫 Отменить'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "cancelAmountInput", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^reject_check_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "rejectCheck", null);
__decorate([
    (0, common_1.UseGuards)(operator_guard_1.OperatorGuard),
    (0, nestjs_telegraf_1.Command)('my_requisites'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "showMyRequisites", null);
__decorate([
    (0, common_1.UseGuards)(operator_guard_1.OperatorGuard),
    (0, nestjs_telegraf_1.Command)('my_balance'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "showMyBalance", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Command)('all_req'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "listReq", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^select_operators_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "selectOperators", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^select_op_req_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "selectRequisite", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^toggle_req_(.+)_op_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "toggleRequisite", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^save_requisites_op_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "saveRequisites", null);
__decorate([
    (0, nestjs_telegraf_1.Command)('withdraw_group_balance'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleWithdrawGroupBalanceCommand", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^approve_group_withdraw_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleApproveGroupWithdraw", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^reject_group_withdraw_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleRejectGroupWithdraw", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^reject_withdraw_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleRejectWithdraw", null);
__decorate([
    (0, nestjs_telegraf_1.Command)('pending'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handlePendingCommand", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/open_check_(.+)/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleOpenCheck", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^CONFIRM_ADMIN_WITHDRAW_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleConfirmWithdraw", null);
__decorate([
    (0, nestjs_telegraf_1.On)('text'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context, Function]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleText", null);
__decorate([
    (0, nestjs_telegraf_1.On)('message'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BotUpdate.prototype, "handleMigrate", null);
exports.BotUpdate = BotUpdate = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    __param(5, (0, nestjs_telegraf_1.InjectBot)()),
    __metadata("design:paramtypes", [user_service_1.UserService,
        group_service_1.GroupService,
        requisite_service_1.RequisiteService,
        withdraw_service_1.WithdrawService,
        operation_service_1.OperationService,
        telegraf_1.Telegraf])
], BotUpdate);
//# sourceMappingURL=bot.update.js.map