import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryOptions, Types, UpdateQuery } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Requisite } from '../schemas/requisite.schema';
import { GroupDocument } from '../schemas/group.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}
  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async getOperatorsByGroupId(groupId: Types.ObjectId | string) {
    return this.userModel.find({
      groups: groupId,
      role: UserRole.OPERATOR,
    });
  }

  async isOperatorInGroup(
    telegramId: number,
    groupId: Types.ObjectId | string,
  ): Promise<boolean> {
    const user = await this.userModel.findOne({ telegram_id: telegramId });
    if (!user) return false;

    // Проверяем, является ли пользователь оператором в группе
    return user.groups.some((g) => g.toString() === groupId);
  }

  async getOperatorBalance(operatorId: Types.ObjectId): Promise<number> {
    const operator = await this.userModel
      .findById(operatorId)
      .populate<{ requisites: Requisite[] }>('requisites');

    if (!operator || !operator.requisites) return 0;

    return operator.requisites.reduce(
      (sum, req) => sum + (req.balance || 0),
      0,
    );
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

  async getOperatorRequisites(operatorId: Types.ObjectId | string) {
    const operator = await this.userModel
      .findById(operatorId)
      .populate<{ requisites: Requisite[] }>('requisites');

    return operator.requisites;
  }

  async bindOperatorToGroup(
    groupId: Types.ObjectId | string,
    operatorId: Types.ObjectId | string,
  ): Promise<GroupDocument> {
    return this.userModel.findOneAndUpdate(
      { _id: operatorId },
      { $addToSet: { groups: groupId } },
      { new: true },
    );
  }

  async unbindOperatorFromGroup(
    groupId: Types.ObjectId | string,
    operatorId: Types.ObjectId | string,
  ): Promise<GroupDocument> {
    return this.userModel.findOneAndUpdate(
      { _id: operatorId },
      { $pull: { groups: groupId } },
      { new: true },
    );
  }

  async isOperatorBoundToGroup(
    operatorId: string,
    groupId: string | Types.ObjectId,
  ): Promise<boolean> {
    return !!(await this.userModel.exists({
      _id: operatorId,
      groups: new Types.ObjectId(groupId),
    }));
  }

  async getAdmins(): Promise<UserDocument[]> {
    return this.userModel
      .find({
        role: UserRole.ADMIN,
      })
      .exec();
  }

  async findOperatorsByGroupId(groupId: Types.ObjectId | string) {
    return this.userModel
      .find({
        groups: new Types.ObjectId(groupId),
        role: UserRole.OPERATOR,
      })
      .exec();
  }

  async updateBalance(
    operatorId: string,
    amount: number,
  ): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(
      operatorId,
      { $inc: { balance: amount } },
      { new: true },
    );
  }

  async findByIdAndUpdate(
    id: Types.ObjectId,
    update: UpdateQuery<User>,
    options?: QueryOptions,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, update, {
        ...options,
      })
      .exec();
  }

  async findAllUsers(): Promise<User[]> {
    return this.userModel.find({ role: UserRole.USER }).exec();
  }

  async findById(id: Types.ObjectId): Promise<UserDocument> {
    return this.userModel.findById(id);
  }

  async findByTelegramId(id: string | number): Promise<UserDocument> {
    return this.userModel.findOne({ telegram_id: id });
  }

  async setOperatorRole(telegramId: number): Promise<UserDocument> {
    return this.userModel.findOneAndUpdate(
      { telegram_id: telegramId },
      { $set: { role: UserRole.OPERATOR } },
      { new: true },
    );
  }

  async findOrCreateUser(userData: any): Promise<UserDocument> {
    console.log(userData);
    let user = await this.userModel.findOne({
      telegram_id: userData.telegram_id,
    });

    if (!user) {
      user = new this.userModel({
        ...userData,
        role: UserRole.USER,
        balance: 0,
        requisites: [],
        is_active: true,
      });
      await user.save();
    }

    return user;
  }

  async updateUserRole(
    telegram_id: number,
    newRole: UserRole,
  ): Promise<UserDocument> {
    return this.userModel.findOneAndUpdate(
      { telegram_id },
      { $set: { role: newRole } },
      { new: true },
    );
  }

  async getUserByTelegramId(telegramId: number): Promise<UserDocument> {
    return this.userModel.findOne({ telegram_id: telegramId });
  }

  async getAllOperators(): Promise<UserDocument[]> {
    return this.userModel.find({ role: UserRole.OPERATOR });
  }

  async getOperatorsWithGroupBinding(groupId: Types.ObjectId | string) {
    return this.userModel.aggregate([
      {
        $match: { role: UserRole.OPERATOR }, // или ваш enum: UserRole.OPERATOR
      },
      {
        $project: {
          username: 1,
          groups: 1,
          isBound: {
            $in: [new Types.ObjectId(groupId), '$groups'],
          },
        },
      },
    ]);
  }

  async create(createUserDto: any): Promise<User> {
    const createdUser = new this.userModel({
      ...createUserDto,
      role: UserRole.USER,
    });
    return createdUser.save();
  }

  async update(id: string, updateUserDto: any): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateRole(telegram_id: number, role: UserRole): Promise<User> {
    const user = await this.userModel
      .findOneAndUpdate(
        { telegram_id },
        { $addToSet: { roles: role } },
        { new: true },
      )
      .exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${telegram_id} not found`);
    }
    return user;
  }

  async addGroupToOperator(
    operatorId: Types.ObjectId,
    groupId: Types.ObjectId,
  ): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(
      operatorId,
      { $addToSet: { groups: groupId } },
      { new: true },
    );
  }

  async addRequisiteToOperator(
    operatorId: string,
    requisiteId: string,
  ): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(
      operatorId,
      { $addToSet: { requisites: new Types.ObjectId(requisiteId) } },
      { new: true },
    );
  }

  async resetBalance(operatorId: string): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(
      operatorId,
      { $set: { balance: 0 } },
      { new: true },
    );
  }

  async removeRequisiteFromOperator(
    operatorId: Types.ObjectId,
    requisiteId: Types.ObjectId,
  ): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(
      operatorId,
      { $pull: { requisites: requisiteId } },
      { new: true },
    );
  }
}
