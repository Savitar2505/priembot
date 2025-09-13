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
exports.GroupService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const group_schema_1 = require("../schemas/group.schema");
let GroupService = class GroupService {
    constructor(groupModel) {
        this.groupModel = groupModel;
    }
    async findAll() {
        return this.groupModel.find().exec();
    }
    async findById(id) {
        return this.groupModel.findById(id).populate('operator_ids').exec();
    }
    async getGroupBalance(telegramGroupId) {
        return this.groupModel.findOne({ telegram_group_id: telegramGroupId });
    }
    async findOrCreateGroup(data) {
        let group = await this.groupModel.findOne({
            telegramId: data.telegramId,
        });
        if (!group) {
            group = await this.groupModel.create({
                telegramId: data.telegramId,
                title: data.title,
                balance: 0,
            });
        }
        return group;
    }
    async resetGroupBalance(telegramId) {
        return this.groupModel.findOneAndUpdate({ telegram_group_id: telegramId }, { $set: { balance: 0 } }, { new: true });
    }
    async resetDailyBalance(telegramGroupId) {
        const group = await this.groupModel.findOneAndUpdate({ telegram_group_id: telegramGroupId }, {
            $set: { balance: 0 },
        }, { new: true });
        return group;
    }
    async updateBalance(groupId, amount) {
        return this.groupModel.findByIdAndUpdate(groupId, { $inc: { balance: amount } }, { new: true });
    }
    async addOperatorToGroup(telegramGroupId, operatorId) {
        return this.groupModel.findOneAndUpdate({ telegram_group_id: telegramGroupId }, { $addToSet: { operator_ids: operatorId } }, { new: true });
    }
    async getGroupsWithActiveRequisites(groupIds) {
        return this.groupModel.aggregate([
            {
                $match: {
                    _id: { $in: groupIds.map((id) => new mongoose_2.Types.ObjectId(id)) },
                },
            },
            {
                $addFields: {
                    operator_ids_object: {
                        $map: {
                            input: '$operator_ids',
                            as: 'id',
                            in: { $toObjectId: '$$id' },
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'operator_ids_object',
                    foreignField: '_id',
                    as: 'operators',
                },
            },
            {
                $lookup: {
                    from: 'requisites',
                    let: { operatorIds: '$operators._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ['$operator_id', '$$operatorIds'] },
                                        { $eq: ['$is_active', true] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'active_requisites_all',
                },
            },
            {
                $addFields: {
                    operators: {
                        $map: {
                            input: '$operators',
                            as: 'operator',
                            in: {
                                $mergeObjects: [
                                    '$$operator',
                                    {
                                        active_requisites: {
                                            $filter: {
                                                input: '$active_requisites_all',
                                                as: 'req',
                                                cond: { $eq: ['$$req.operator_id', '$$operator._id'] },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    operator_ids_object: 0,
                    active_requisites_all: 0,
                },
            },
        ]);
    }
    async removeOperatorFromGroup(telegramGroupId, operatorId) {
        return this.groupModel.findOneAndUpdate({ telegram_group_id: telegramGroupId }, { $pull: { operator_ids: operatorId } }, { new: true });
    }
    async createOrUpdateGroup(dto) {
        const existingGroup = await this.groupModel.findOne({
            telegram_group_id: dto.telegramGroupId,
        });
        if (existingGroup) {
            return existingGroup;
        }
        const newGroup = new this.groupModel(Object.assign({}, dto));
        return newGroup.save();
    }
    async getAllGroups() {
        return this.groupModel.find().populate('operator_ids').exec();
    }
    async findByIds(ids) {
        return this.groupModel.find({
            _id: { $in: ids },
        });
    }
    async updateChatId(oldChatId, newChatId) {
        return this.groupModel.findOneAndUpdate({ telegram_group_id: oldChatId }, { telegram_group_id: newChatId }, { new: true });
    }
    async addRequisiteToGroup(telegramGroupId, requisiteId) {
        return this.groupModel.findOneAndUpdate({ telegram_group_id: telegramGroupId }, { $addToSet: { requisite_ids: requisiteId } }, { new: true });
    }
    async resetBalance(operatorId) {
        return this.groupModel.findByIdAndUpdate(operatorId, { $set: { balance: 0 } }, { new: true });
    }
    async getGroupWithRequisites(groupId) {
        return this.groupModel.findById(groupId).populate('requisite_ids').exec();
    }
    async findByTelegramId(telegramId) {
        return this.groupModel
            .findOne({ telegram_group_id: telegramId })
            .populate('operator_ids')
            .exec();
    }
};
exports.GroupService = GroupService;
exports.GroupService = GroupService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(group_schema_1.Group.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], GroupService);
//# sourceMappingURL=group.service.js.map