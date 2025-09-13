import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from '../schemas/group.schema';
import { User, UserRole } from '../schemas/user.schema';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
  ) {}

  async findAll(): Promise<Group[]> {
    return this.groupModel.find().exec();
  }

  async findById(id: Types.ObjectId | string): Promise<GroupDocument> {
    return this.groupModel.findById(id).populate('operator_ids').exec();
  }

  async getGroupBalance(telegramGroupId: string) {
    return this.groupModel.findOne({ telegram_group_id: telegramGroupId });
  }

  async findOrCreateGroup(data: { telegramId: string; title: string }) {
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

  async resetGroupBalance(telegramId: string) {
    return this.groupModel.findOneAndUpdate(
      { telegram_group_id: telegramId },
      { $set: { balance: 0 } },
      { new: true },
    );
  }

  async resetDailyBalance(telegramGroupId: string) {
    const group = await this.groupModel.findOneAndUpdate(
      { telegram_group_id: telegramGroupId },
      {
        $set: { balance: 0 },
      },
      { new: true },
    );
    return group;
  }

  async updateBalance(
    groupId: Types.ObjectId | string,
    amount: number,
  ): Promise<GroupDocument> {
    return this.groupModel.findByIdAndUpdate(
      groupId,
      { $inc: { balance: amount } },
      { new: true },
    );
  }

  async addOperatorToGroup(
    telegramGroupId: string,
    operatorId: string,
  ): Promise<GroupDocument> {
    return this.groupModel.findOneAndUpdate(
      { telegram_group_id: telegramGroupId },
      { $addToSet: { operator_ids: operatorId } },
      { new: true },
    );
  }

  async getGroupsWithActiveRequisites(groupIds: Types.ObjectId[]) {
    return this.groupModel.aggregate([
      {
        $match: {
          _id: { $in: groupIds.map((id) => new Types.ObjectId(id)) },
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
        // Для каждого оператора подтягиваем активные реквизиты
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
        // Теперь "соберём" активные реквизиты по операторам
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

  async removeOperatorFromGroup(
    telegramGroupId: string,
    operatorId: Types.ObjectId | string,
  ): Promise<GroupDocument> {
    return this.groupModel.findOneAndUpdate(
      { telegram_group_id: telegramGroupId },
      { $pull: { operator_ids: operatorId } },
      { new: true },
    );
  }

  async createOrUpdateGroup(dto: any): Promise<GroupDocument> {
    const existingGroup = await this.groupModel.findOne({
      telegram_group_id: dto.telegramGroupId,
    });

    if (existingGroup) {
      return existingGroup;
    }

    const newGroup = new this.groupModel({
      ...dto,
    });

    return newGroup.save();
  }

  async getAllGroups(): Promise<GroupDocument[]> {
    return this.groupModel.find().populate('operator_ids').exec();
  }

  async findByIds(ids: Types.ObjectId[] | string[]) {
    return this.groupModel.find({
      _id: { $in: ids },
    });
  }

  async updateChatId(oldChatId: number, newChatId: number) {
    return this.groupModel.findOneAndUpdate(
      { telegram_group_id: oldChatId },
      { telegram_group_id: newChatId },
      { new: true },
    );
  }

  async addRequisiteToGroup(
    telegramGroupId: string,
    requisiteId: string,
  ): Promise<GroupDocument> {
    return this.groupModel.findOneAndUpdate(
      { telegram_group_id: telegramGroupId },
      { $addToSet: { requisite_ids: requisiteId } },
      { new: true },
    );
  }

  async resetBalance(operatorId: string): Promise<GroupDocument> {
    return this.groupModel.findByIdAndUpdate(
      operatorId,
      { $set: { balance: 0 } },
      { new: true },
    );
  }

  async getGroupWithRequisites(groupId: string): Promise<GroupDocument> {
    return this.groupModel.findById(groupId).populate('requisite_ids').exec();
  }

  async findByTelegramId(telegramId: number | string): Promise<GroupDocument> {
    return this.groupModel
      .findOne({ telegram_group_id: telegramId })
      .populate('operator_ids')
      .exec();
  }
}
