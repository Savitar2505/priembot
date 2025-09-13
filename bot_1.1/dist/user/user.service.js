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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../schemas/user.schema");
let UserService = class UserService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findAll() {
        return this.userModel.find().exec();
    }
    async getOperatorsByGroupId(groupId) {
        return this.userModel.find({
            groups: groupId,
            role: user_schema_1.UserRole.OPERATOR,
        });
    }
    async isOperatorInGroup(telegramId, groupId) {
        const user = await this.userModel.findOne({ telegram_id: telegramId });
        if (!user)
            return false;
        return user.groups.some((g) => g.toString() === groupId);
    }
    async getOperatorBalance(operatorId) {
        const operator = await this.userModel
            .findById(operatorId)
            .populate('requisites');
        if (!operator || !operator.requisites)
            return 0;
        return operator.requisites.reduce((sum, req) => sum + (req.balance || 0), 0);
    }
    async getOperatorsWithBalance() {
        return this.userModel.aggregate([
            { $match: { role: 'operator' } },
            {
                $lookup: {
                    from: 'requisites',
                    localField: 'requisites',
                    foreignField: '_id',
                    as: 'requisites',
                },
            },
            {
                $addFields: {
                    balance: {
                        $sum: {
                            $map: {
                                input: '$requisites',
                                as: 'req',
                                in: { $ifNull: ['$$req.balance', 0] },
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    username: 1,
                    balance: 1,
                    requisites: {
                        $map: {
                            input: '$requisites',
                            as: 'req',
                            in: {
                                name: '$$req.name',
                                balance: '$$req.balance',
                            },
                        },
                    },
                },
            },
        ]);
    }
    async getOperatorRequisites(operatorId) {
        const operator = await this.userModel
            .findById(operatorId)
            .populate('requisites');
        return operator.requisites;
    }
    async bindOperatorToGroup(groupId, operatorId) {
        return this.userModel.findOneAndUpdate({ _id: operatorId }, { $addToSet: { groups: groupId } }, { new: true });
    }
    async unbindOperatorFromGroup(groupId, operatorId) {
        return this.userModel.findOneAndUpdate({ _id: operatorId }, { $pull: { groups: groupId } }, { new: true });
    }
    async isOperatorBoundToGroup(operatorId, groupId) {
        return !!(await this.userModel.exists({
            _id: operatorId,
            groups: new mongoose_2.Types.ObjectId(groupId),
        }));
    }
    async getAdmins() {
        return this.userModel
            .find({
            role: user_schema_1.UserRole.ADMIN,
        })
            .exec();
    }
    async findOperatorsByGroupId(groupId) {
        return this.userModel
            .find({
            groups: new mongoose_2.Types.ObjectId(groupId),
            role: user_schema_1.UserRole.OPERATOR,
        })
            .exec();
    }
    async updateBalance(operatorId, amount) {
        return this.userModel.findByIdAndUpdate(operatorId, { $inc: { balance: amount } }, { new: true });
    }
    async findByIdAndUpdate(id, update, options) {
        return this.userModel
            .findByIdAndUpdate(id, update, Object.assign({}, options))
            .exec();
    }
    async findAllUsers() {
        return this.userModel.find({ role: user_schema_1.UserRole.USER }).exec();
    }
    async findById(id) {
        return this.userModel.findById(id);
    }
    async findByTelegramId(id) {
        return this.userModel.findOne({ telegram_id: id });
    }
    async setOperatorRole(telegramId) {
        return this.userModel.findOneAndUpdate({ telegram_id: telegramId }, { $set: { role: user_schema_1.UserRole.OPERATOR } }, { new: true });
    }
    async findOrCreateUser(userData) {
        console.log(userData);
        let user = await this.userModel.findOne({
            telegram_id: userData.telegram_id,
        });
        if (!user) {
            user = new this.userModel(Object.assign(Object.assign({}, userData), { role: user_schema_1.UserRole.USER, balance: 0, requisites: [], is_active: true }));
            await user.save();
        }
        return user;
    }
    async updateUserRole(telegram_id, newRole) {
        return this.userModel.findOneAndUpdate({ telegram_id }, { $set: { role: newRole } }, { new: true });
    }
    async getUserByTelegramId(telegramId) {
        return this.userModel.findOne({ telegram_id: telegramId });
    }
    async getAllOperators() {
        return this.userModel.find({ role: user_schema_1.UserRole.OPERATOR });
    }
    async getOperatorsWithGroupBinding(groupId) {
        return this.userModel.aggregate([
            {
                $match: { role: user_schema_1.UserRole.OPERATOR },
            },
            {
                $project: {
                    username: 1,
                    groups: 1,
                    isBound: {
                        $in: [new mongoose_2.Types.ObjectId(groupId), '$groups'],
                    },
                },
            },
        ]);
    }
    async create(createUserDto) {
        const createdUser = new this.userModel(Object.assign(Object.assign({}, createUserDto), { role: user_schema_1.UserRole.USER }));
        return createdUser.save();
    }
    async update(id, updateUserDto) {
        const user = await this.userModel
            .findByIdAndUpdate(id, updateUserDto, { new: true })
            .exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async updateRole(telegram_id, role) {
        const user = await this.userModel
            .findOneAndUpdate({ telegram_id }, { $addToSet: { roles: role } }, { new: true })
            .exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${telegram_id} not found`);
        }
        return user;
    }
    async addGroupToOperator(operatorId, groupId) {
        return this.userModel.findByIdAndUpdate(operatorId, { $addToSet: { groups: groupId } }, { new: true });
    }
    async addRequisiteToOperator(operatorId, requisiteId) {
        return this.userModel.findByIdAndUpdate(operatorId, { $addToSet: { requisites: new mongoose_2.Types.ObjectId(requisiteId) } }, { new: true });
    }
    async resetBalance(operatorId) {
        return this.userModel.findByIdAndUpdate(operatorId, { $set: { balance: 0 } }, { new: true });
    }
    async removeRequisiteFromOperator(operatorId, requisiteId) {
        return this.userModel.findByIdAndUpdate(operatorId, { $pull: { requisites: requisiteId } }, { new: true });
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UserService);
//# sourceMappingURL=user.service.js.map