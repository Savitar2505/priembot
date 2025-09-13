import { UserService } from 'src/user/user.service';
import { Context } from 'telegraf';
import { GroupService } from '../group/group.service';
import { RequisiteService } from '../requisite/requisite.service';
export declare class BalanceUpdate {
    private groupService;
    private userService;
    private requisiteService;
    constructor(groupService: GroupService, userService: UserService, requisiteService: RequisiteService);
    showBalanceMenu(ctx: Context): Promise<void>;
    showGroupsBalance(ctx: Context): Promise<void>;
    showOperatorsBalance(ctx: Context): Promise<void>;
    showRequisitesBalance(ctx: Context): Promise<void>;
}
