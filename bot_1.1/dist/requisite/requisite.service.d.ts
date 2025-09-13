import { Model, Types } from 'mongoose';
import { Requisite, RequisiteDocument } from '../schemas/requisite.schema';
import { GroupDocument } from '../schemas/group.schema';
import { UserService } from '../user/user.service';
export declare class RequisiteService {
    private requisiteModel;
    private readonly userService;
    constructor(requisiteModel: Model<RequisiteDocument>, userService: UserService);
    createRequisite(dto: any): Promise<RequisiteDocument>;
    getCryptoRequisites(): Promise<RequisiteDocument[]>;
    getActiveForGroup(groupId: Types.ObjectId): Promise<RequisiteDocument>;
    updateBalance(requisiteId: string, amount: number): Promise<RequisiteDocument>;
    create(dto: any): Promise<RequisiteDocument>;
    update(id: string, dto: any): Promise<RequisiteDocument>;
    delete(id: string): Promise<RequisiteDocument>;
    getRequisiteBalance(requisiteId: string): Promise<number>;
    getActiveRequisitesForGroup(groupId: Types.ObjectId): Promise<RequisiteDocument[]>;
    getActiveRequisitesForOperator(operatorId: Types.ObjectId | string): Promise<(import("mongoose").Document<unknown, {}, RequisiteDocument, {}> & Requisite & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    addRequisiteToGroup(groupId: Types.ObjectId, requisiteId: string): Promise<GroupDocument>;
    getAllActive(): Promise<(import("mongoose").Document<unknown, {}, RequisiteDocument, {}> & Requisite & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    findAll(): Promise<RequisiteDocument[]>;
    findByOperator(operatorId: Types.ObjectId | string): Promise<RequisiteDocument[]>;
    toggleActive(requisiteId: string): Promise<import("mongoose").Document<unknown, {}, RequisiteDocument, {}> & Requisite & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    findByIds(ids: Types.ObjectId[] | string[]): Promise<(import("mongoose").Document<unknown, {}, RequisiteDocument, {}> & Requisite & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    bindToOperator(requisiteId: string, operatorId: string): Promise<RequisiteDocument>;
    unbindFromOperator(requisiteId: string): Promise<RequisiteDocument>;
    findById(id: Types.ObjectId | string): Promise<RequisiteDocument>;
    getOperatorRequisites(operatorId: string): Promise<RequisiteDocument[]>;
    resetRequisiteBalance(requisiteId: string, balance: number): Promise<import("mongoose").Document<unknown, {}, RequisiteDocument, {}> & Requisite & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    decreaseRequisiteBalance(requisiteId: string, amount: number): Promise<import("mongoose").Document<unknown, {}, RequisiteDocument, {}> & Requisite & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    withdrawFromRequisite(operatorId: Types.ObjectId, requisiteId: Types.ObjectId, amount: number): Promise<Requisite>;
    getAvailableRequisites(): Promise<RequisiteDocument[]>;
    getUnboundRequisites(): Promise<RequisiteDocument[]>;
}
