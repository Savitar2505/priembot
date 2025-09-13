import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from '../schemas/group.schema';
export declare class GroupService {
    private readonly groupModel;
    constructor(groupModel: Model<GroupDocument>);
    findAll(): Promise<Group[]>;
    findById(id: Types.ObjectId | string): Promise<GroupDocument>;
    getGroupBalance(telegramGroupId: string): Promise<import("mongoose").Document<unknown, {}, GroupDocument, {}> & Group & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    findOrCreateGroup(data: {
        telegramId: string;
        title: string;
    }): Promise<import("mongoose").Document<unknown, {}, GroupDocument, {}> & Group & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    resetGroupBalance(telegramId: string): Promise<import("mongoose").Document<unknown, {}, GroupDocument, {}> & Group & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    resetDailyBalance(telegramGroupId: string): Promise<import("mongoose").Document<unknown, {}, GroupDocument, {}> & Group & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateBalance(groupId: Types.ObjectId | string, amount: number): Promise<GroupDocument>;
    addOperatorToGroup(telegramGroupId: string, operatorId: string): Promise<GroupDocument>;
    getGroupsWithActiveRequisites(groupIds: Types.ObjectId[]): Promise<any[]>;
    removeOperatorFromGroup(telegramGroupId: string, operatorId: Types.ObjectId | string): Promise<GroupDocument>;
    createOrUpdateGroup(dto: any): Promise<GroupDocument>;
    getAllGroups(): Promise<GroupDocument[]>;
    findByIds(ids: Types.ObjectId[] | string[]): Promise<(import("mongoose").Document<unknown, {}, GroupDocument, {}> & Group & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    updateChatId(oldChatId: number, newChatId: number): Promise<import("mongoose").Document<unknown, {}, GroupDocument, {}> & Group & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    addRequisiteToGroup(telegramGroupId: string, requisiteId: string): Promise<GroupDocument>;
    resetBalance(operatorId: string): Promise<GroupDocument>;
    getGroupWithRequisites(groupId: string): Promise<GroupDocument>;
    findByTelegramId(telegramId: number | string): Promise<GroupDocument>;
}
