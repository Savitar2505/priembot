import { Model, QueryOptions, Types, UpdateQuery } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Requisite } from '../schemas/requisite.schema';
import { GroupDocument } from '../schemas/group.schema';
export declare class UserService {
    private readonly userModel;
    constructor(userModel: Model<UserDocument>);
    findAll(): Promise<User[]>;
    getOperatorsByGroupId(groupId: Types.ObjectId | string): Promise<(import("mongoose").Document<unknown, {}, UserDocument, {}> & User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    isOperatorInGroup(telegramId: number, groupId: Types.ObjectId | string): Promise<boolean>;
    getOperatorBalance(operatorId: Types.ObjectId): Promise<number>;
    getOperatorsWithBalance(): Promise<any[]>;
    getOperatorRequisites(operatorId: Types.ObjectId | string): Promise<Requisite[]>;
    bindOperatorToGroup(groupId: Types.ObjectId | string, operatorId: Types.ObjectId | string): Promise<GroupDocument>;
    unbindOperatorFromGroup(groupId: Types.ObjectId | string, operatorId: Types.ObjectId | string): Promise<GroupDocument>;
    isOperatorBoundToGroup(operatorId: string, groupId: string | Types.ObjectId): Promise<boolean>;
    getAdmins(): Promise<UserDocument[]>;
    findOperatorsByGroupId(groupId: Types.ObjectId | string): Promise<(import("mongoose").Document<unknown, {}, UserDocument, {}> & User & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    updateBalance(operatorId: string, amount: number): Promise<UserDocument>;
    findByIdAndUpdate(id: Types.ObjectId, update: UpdateQuery<User>, options?: QueryOptions): Promise<User | null>;
    findAllUsers(): Promise<User[]>;
    findById(id: Types.ObjectId): Promise<UserDocument>;
    findByTelegramId(id: string | number): Promise<UserDocument>;
    setOperatorRole(telegramId: number): Promise<UserDocument>;
    findOrCreateUser(userData: any): Promise<UserDocument>;
    updateUserRole(telegram_id: number, newRole: UserRole): Promise<UserDocument>;
    getUserByTelegramId(telegramId: number): Promise<UserDocument>;
    getAllOperators(): Promise<UserDocument[]>;
    getOperatorsWithGroupBinding(groupId: Types.ObjectId | string): Promise<any[]>;
    create(createUserDto: any): Promise<User>;
    update(id: string, updateUserDto: any): Promise<User>;
    updateRole(telegram_id: number, role: UserRole): Promise<User>;
    addGroupToOperator(operatorId: Types.ObjectId, groupId: Types.ObjectId): Promise<UserDocument>;
    addRequisiteToOperator(operatorId: string, requisiteId: string): Promise<UserDocument>;
    resetBalance(operatorId: string): Promise<UserDocument>;
    removeRequisiteFromOperator(operatorId: Types.ObjectId, requisiteId: Types.ObjectId): Promise<UserDocument>;
}
