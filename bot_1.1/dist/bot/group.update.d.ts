import { UserService } from 'src/user/user.service';
import { Context } from 'telegraf';
import { GroupService } from '../group/group.service';
import { RequisiteService } from '../requisite/requisite.service';
export declare class GroupUpdate {
    private groupService;
    private userService;
    private requisiteService;
    constructor(groupService: GroupService, userService: UserService, requisiteService: RequisiteService);
    listGroups(ctx: Context): Promise<void>;
    groupActionsMenu(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    handleBalanceCommand(ctx: Context): Promise<import("@telegraf/types").Message.TextMessage>;
    handleResetBalance(ctx: Context): Promise<import("@telegraf/types").Message.TextMessage>;
    bindRequisiteToGroup(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    processRequisiteSelection(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    renameGroup(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    bindOperatorToGroup(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    processOperatorSelection(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
}
