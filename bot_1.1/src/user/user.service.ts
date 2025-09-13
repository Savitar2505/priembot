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
    console.log(`🔍 UserService.findAll called at: ${new Date().toISOString()}`);
    try {
      const result = await this.userModel.find().exec();
      console.log('✅ findAll operation successful, found:', result.length, 'users');
      return result;
    } catch (error) {
      console.error('❌ findAll operation failed:', error.message);
      throw error;
    }
  }

  async getOperatorsByGroupId(groupId: Types.ObjectId | string) {
    console.log(`🔍 UserService.getOperatorsByGroupId called: ${groupId}`);
    try {
      const result = await this.userModel.find({
        groups: groupId,
        role: UserRole.OPERATOR,
      });
      console.log('✅ getOperatorsByGroupId operation successful, found:', result.length, 'operators');
      return result;
    } catch (error) {
      console.error('❌ getOperatorsByGroupId operation failed:', error.message);
      throw error;
    }
  }

  async isOperatorInGroup(
      telegramId: number,
      groupId: Types.ObjectId | string,
  ): Promise<boolean> {
    console.log(`🔍 UserService.isOperatorInGroup called: telegramId=${telegramId}, groupId=${groupId}`);
    try {
      const user = await this.userModel.findOne({ telegram_id: telegramId });
      if (!user) {
        console.log('✅ User not found, returning false');
        return false;
      }

      const result = user.groups.some((g) => g.toString() === groupId);
      console.log('✅ isOperatorInGroup operation successful, result:', result);
      return result;
    } catch (error) {
      console.error('❌ isOperatorInGroup operation failed:', error.message);
      throw error;
    }
  }

  async getOperatorBalance(operatorId: Types.ObjectId): Promise<number> {
    console.log(`🔍 UserService.getOperatorBalance called: ${operatorId}`);
    try {
      const operator = await this.userModel
          .findById(operatorId)
          .populate<{ requisites: Requisite[] }>('requisites');

      if (!operator || !operator.requisites) {
        console.log('✅ Operator or requisites not found, returning 0');
        return 0;
      }

      const balance = operator.requisites.reduce(
          (sum, req) => sum + (req.balance || 0),
          0,
      );
      console.log('✅ getOperatorBalance operation successful, balance:', balance);
      return balance;
    } catch (error) {
      console.error('❌ getOperatorBalance operation failed:', error.message);
      throw error;
    }
  }

  async getOperatorsWithBalance() {
    console.log(`🔍 UserService.getOperatorsWithBalance called at: ${new Date().toISOString()}`);
    try {
      const result = await this.userModel.aggregate([
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
      console.log('✅ getOperatorsWithBalance operation successful, found:', result.length, 'operators');
      return result;
    } catch (error) {
      console.error('❌ getOperatorsWithBalance operation failed:', error.message);
      throw error;
    }
  }

  async getOperatorRequisites(operatorId: Types.ObjectId | string) {
    console.log(`🔍 UserService.getOperatorRequisites called: ${operatorId}`);
    try {
      const operator = await this.userModel
          .findById(operatorId)
          .populate<{ requisites: Requisite[] }>('requisites');

      console.log('✅ getOperatorRequisites operation successful, requisites:', operator?.requisites?.length || 0);
      return operator.requisites;
    } catch (error) {
      console.error('❌ getOperatorRequisites operation failed:', error.message);
      throw error;
    }
  }

  async bindOperatorToGroup(
      groupId: Types.ObjectId | string,
      operatorId: Types.ObjectId | string,
  ): Promise<GroupDocument> {
    console.log(`🔍 UserService.bindOperatorToGroup called: operatorId=${operatorId}, groupId=${groupId}`);
    try {
      const result = await this.userModel.findOneAndUpdate(
          { _id: operatorId },
          { $addToSet: { groups: groupId } },
          { new: true },
      );
      console.log('✅ bindOperatorToGroup operation successful');
      // @ts-ignore
      return result;
    }
    catch (error) {
      console.error('❌ bindOperatorToGroup operation failed:', error.message);
      throw error;
    }
  }

  async unbindOperatorFromGroup(
      groupId: Types.ObjectId | string,
      operatorId: Types.ObjectId | string,
  ): Promise<GroupDocument> {
    console.log(`🔍 UserService.unbindOperatorFromGroup called: operatorId=${operatorId}, groupId=${groupId}`);
    try {
      const result = await this.userModel.findOneAndUpdate(
          { _id: operatorId },
          { $pull: { groups: groupId } },
          { new: true },
      );
      console.log('✅ unbindOperatorFromGroup operation successful'); // @ts-ignore
      return result;
    } catch (error) {
      console.error('❌ unbindOperatorFromGroup operation failed:', error.message);
      throw error;
    }
  }

  async isOperatorBoundToGroup(
      operatorId: string,
      groupId: string | Types.ObjectId,
  ): Promise<boolean> {
    console.log(`🔍 UserService.isOperatorBoundToGroup called: operatorId=${operatorId}, groupId=${groupId}`);
    try {
      const result = !!(await this.userModel.exists({
        _id: operatorId,
        groups: new Types.ObjectId(groupId),
      }));
      console.log('✅ isOperatorBoundToGroup operation successful, result:', result); return result;
    } catch (error) {
      console.error('❌ isOperatorBoundToGroup operation failed:', error.message);
      throw error;
    }
  }

  async getAdmins(): Promise<UserDocument[]> {
    console.log(`🔍 UserService.getAdmins called at: ${new Date().toISOString()}`);
    try {
      const result = await this.userModel
          .find({
            role: UserRole.ADMIN,
          })
          .exec();
      console.log('✅ getAdmins operation successful, found:', result.length, 'admins');
      return result;
    } catch (error) {
      console.error('❌ getAdmins operation failed:', error.message);
      throw error;
    }
  }

  async findOperatorsByGroupId(groupId: Types.ObjectId | string) {
    console.log(`🔍 UserService.findOperatorsByGroupId called: ${groupId}`);
    try {
      const result = await this.userModel
          .find({
            groups: new Types.ObjectId(groupId),
            role: UserRole.OPERATOR,
          })
          .exec();
      console.log('✅ findOperatorsByGroupId operation successful, found:', result.length, 'operators');
      return result;
    } catch (error) {
      console.error('❌ findOperatorsByGroupId operation failed:', error.message);
      throw error;
    }
  }

  async updateBalance(
      operatorId: string,
      amount: number,
  ): Promise<UserDocument> {
    console.log(`🔍 UserService.updateBalance called: operatorId=${operatorId}, amount=${amount}`);
    try {
      const result = await this.userModel.findByIdAndUpdate(
          operatorId,
          { $inc: { balance: amount } },
          { new: true },
      );
      console.log('✅ updateBalance operation successful, new balance:', result?.balance);
      return result;
    } catch (error) {
      console.error('❌ updateBalance operation failed:', error.message);
      throw error;
    }
  }

  async findByIdAndUpdate(
      id: Types.ObjectId,
      update: UpdateQuery<User>,
      options?: QueryOptions,
  ): Promise<User | null> {
    console.log(`🔍 UserService.findByIdAndUpdate called: id=${id}`);
    try {
      const result = await this.userModel
          .findByIdAndUpdate(id, update, {
            ...options,
          })
          .exec();
      console.log('✅ findByIdAndUpdate operation successful');
      return result;
    } catch (error) {
      console.error('❌ findByIdAndUpdate operation failed:', error.message);
      throw error;
    }
  }

  async findAllUsers(): Promise<User[]> {
    console.log(`🔍 UserService.findAllUsers called at: ${new Date().toISOString()}`);
    try {
      const result = await this.userModel.find({ role: UserRole.USER }).exec();
      console.log('✅ findAllUsers operation successful, found:', result.length, 'users');
      return result;
    } catch (error) {
      console.error('❌ findAllUsers operation failed:', error.message);
      throw error;
    }
  }

  async findById(id: Types.ObjectId): Promise<UserDocument> {
    console.log(`🔍 UserService.findById called: ${id}`);
    try {
      const result = await this.userModel.findById(id);
      console.log('✅ findById operation successful, user found:', !!result);
      return result;
    } catch (error) {
      console.error('❌ findById operation failed:', error.message);
      throw error;
    }
  }

  async findByTelegramId(id: string | number): Promise<UserDocument> {
    console.log(`🔍 UserService.findByTelegramId called: ${id}`);
    try {
      const result = await this.userModel.findOne({ telegram_id: id });
      console.log('✅ findByTelegramId operation successful, user found:', !!result);
      return result;
    } catch (error) {
      console.error('❌ findByTelegramId operation failed:');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error codeName:', error.codeName);
      throw error;
    }
  }

  async setOperatorRole(telegramId: number): Promise<UserDocument> {
    console.log(`🔍 UserService.setOperatorRole called: ${telegramId}`);
    try {
      const result = await this.userModel.findOneAndUpdate(
          { telegram_id: telegramId },
          { $set: { role: UserRole.OPERATOR } },
          { new: true },
      );
      console.log('✅ setOperatorRole operation successful');
      return result;
    } catch (error) {
      console.error('❌ setOperatorRole operation failed:', error.message);
      throw error;
    }
  }

  async findOrCreateUser(userData: any): Promise<UserDocument> {
    console.log(`🔍 UserService.findOrCreateUser called at: ${new Date().toISOString()}`);
    console.log('User data:', userData);

    try {
      let user = await this.userModel.findOne({
        telegram_id: userData.telegram_id,
      });

      if (!user) {
        console.log('🆕 Creating new user');
        user = new this.userModel({
          ...userData,
          role: UserRole.USER,
          balance: 0,
          requisites: [],
          is_active: true,
        });
        await user.save();
        console.log('✅ New user created successfully');
      } else {
        console.log('✅ Existing user found');
      }

      return user;
    } catch (error) {
      console.error('❌ findOrCreateUser operation failed:');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error codeName:', error.codeName);
      throw error;
    }
  }

  async updateUserRole(
      telegram_id: number,
      newRole: UserRole,
  ): Promise<UserDocument> {
    console.log(`🔍 UserService.updateUserRole called: telegram_id=${telegram_id}, newRole=${newRole}`);
    try {
      const result = await this.userModel.findOneAndUpdate(
          { telegram_id },
          { $set: { role: newRole } },
          { new: true },
      );
      console.log('✅ updateUserRole operation successful');
      return result;
    } catch (error) {
      console.error('❌ updateUserRole operation failed:', error.message);
      throw error;
    }
  }

  async getUserByTelegramId(telegramId: number): Promise<UserDocument> {
    console.log(`🔍 UserService.getUserByTelegramId called: ${telegramId}`);
    try {
      const result = await this.userModel.findOne({ telegram_id: telegramId });
      console.log('✅ getUserByTelegramId operation successful, user found:', !!result);
      return result;
    } catch (error) {
      console.error('❌ getUserByTelegramId operation failed:', error.message);
      throw error;
    }
  }

  async getAllOperators(): Promise<UserDocument[]> {
    console.log(`🔍 UserService.getAllOperators called at: ${new Date().toISOString()}`);
    try {
      const result = await this.userModel.find({ role: UserRole.OPERATOR });
      console.log('✅ getAllOperators operation successful, found:', result.length, 'operators');
      return result;
    } catch (error) {
      console.error('❌ getAllOperators operation failed:', error.message);
      throw error;
    }
  }

  async getOperatorsWithGroupBinding(groupId: Types.ObjectId | string) {
    console.log(`🔍 UserService.getOperatorsWithGroupBinding called: ${groupId}`);
    try {
      const result = await this.userModel.aggregate([
        {
          $match: { role: UserRole.OPERATOR },
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
      console.log('✅ getOperatorsWithGroupBinding operation successful, found:', result.length, 'operators');
      return result;
    } catch (error) {
      console.error('❌ getOperatorsWithGroupBinding operation failed:', error.message);
      throw error;
    }
  }

  async create(createUserDto: any): Promise<User> {
    console.log(`🔍 UserService.create called at: ${new Date().toISOString()}`);
    try {
      const createdUser = new this.userModel({
        ...createUserDto,
        role: UserRole.USER,
      });
      const result = await createdUser.save();
      console.log('✅ create operation successful, user created with id:', result._id);
      return result;
    } catch (error) {
      console.error('❌ create operation failed:', error.message);
      throw error;
    }
  }

  async update(id: string, updateUserDto: any): Promise<User> {
    console.log(`🔍 UserService.update called: id=${id}`);
    try {
      const user = await this.userModel
          .findByIdAndUpdate(id, updateUserDto, { new: true })
          .exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      console.log('✅ update operation successful');
      return user;
    } catch (error) {
      console.error('❌ update operation failed:', error.message);
      throw error;
    }
  }

  async updateRole(telegram_id: number, role: UserRole): Promise<User> {
    console.log(`🔍 UserService.updateRole called: telegram_id=${telegram_id}, role=${role}`);
    try {
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
      console.log('✅ updateRole operation successful');
      return user;
    } catch (error) {
      console.error('❌ updateRole operation failed:', error.message);
      throw error;
    }
  }

  async addGroupToOperator(
      operatorId: Types.ObjectId,
      groupId: Types.ObjectId,
  ): Promise<UserDocument> {
    console.log(`🔍 UserService.addGroupToOperator called: operatorId=${operatorId}, groupId=${groupId}`);
    try {
      const result = await this.userModel.findByIdAndUpdate(
          operatorId,
          { $addToSet: { groups: groupId } },
          { new: true },
      );
      console.log('✅ addGroupToOperator operation successful');
      return result;
    } catch (error) {
      console.error('❌ addGroupToOperator operation failed:', error.message);
      throw error;
    }
  }

  async addRequisiteToOperator(
      operatorId: string,
      requisiteId: string,
  ): Promise<UserDocument> {
    console.log(`🔍 UserService.addRequisiteToOperator called: operatorId=${operatorId}, requisiteId=${requisiteId}`);
    try {
      const result = await this.userModel.findByIdAndUpdate(
          operatorId,
          { $addToSet: { requisites: new Types.ObjectId(requisiteId) } },
          { new: true },
      );
      console.log('✅ addRequisiteToOperator operation successful');
      return result;
    } catch (error) {
      console.error('❌ addRequisiteToOperator operation failed:', error.message);
      throw error;
    }
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