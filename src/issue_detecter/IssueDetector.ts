import { EIssueType, Issue } from "../models/Issue";

export enum EIssueDetectorState {
    None,
    Activated,
    Finished,
}

export interface IIssueDetector {
    receiveLine(line: string): EIssueDetectorState;
    pickIssue(): Issue;
}

const PUERTS_ERROR_KEYWORD = "Puerts: Error:";
const PUERTS_DEMO_PTR = "(0x0x300b08e68)";
const PUERTS_STACK_KEYWORD = "    at ";

export class PuertsExceptionDetector implements IIssueDetector {

    private issue?: Issue;
    private state: EIssueDetectorState = EIssueDetectorState.None;

    public receiveLine(line: string): EIssueDetectorState {

        if (this.state === EIssueDetectorState.None) {

            if (line.indexOf(PUERTS_ERROR_KEYWORD) > 0) {
                this.issue = new Issue(EIssueType.Error, this.getMessageFromFirstLogLine(line));
                this.state = EIssueDetectorState.Activated;

                this.issue.addLogLine(line);

                const stackKeywordIndex = line.indexOf(PUERTS_STACK_KEYWORD);
                if (stackKeywordIndex >= 0) {
                    this.issue.setIssueType(EIssueType.Exception);
                    this.issue.addStacktraceLine(line.substring(stackKeywordIndex));
                }

                return EIssueDetectorState.Activated;
            }
            else {
                return EIssueDetectorState.None;
            }
        }
        else {

            if (this.isLogIndicateFinished(line)) {
                this.issue!.addLogLine(line);

                return EIssueDetectorState.Finished;
            }
            else {
                const stackKeywordIndex = line.indexOf(PUERTS_STACK_KEYWORD);
                if (stackKeywordIndex >= 0) {
                    if (this.issue) {
                        this.issue.setIssueType(EIssueType.Exception);
                        this.issue.addStacktraceLine(line.substring(stackKeywordIndex + PUERTS_STACK_KEYWORD.length + 1));
                    }
                }

                return EIssueDetectorState.Activated;
            }
        }

    }

    public pickIssue(): Issue {
        if (!this.issue) {
            console.error("issue not exist");
            throw Error("issue not exist");
        }
        else {

            let issue = this.issue;
            this.issue = undefined;
            this.state = EIssueDetectorState.None;

            if (issue.stackTrace && issue.stackTrace.length > 0){
                const msg = issue.stackTrace.join('\n');
                console.log(`stacktrace:\n${msg}`);
            }

            return issue;
        }

    }

    private getMessageFromFirstLogLine(line: string): string {
        const msgIndex = line.indexOf(PUERTS_ERROR_KEYWORD) + PUERTS_ERROR_KEYWORD.length + PUERTS_DEMO_PTR.length + 2;

        const msg = line.substring(msgIndex);

        // console.log(`getMessageFromFirstLogLine:${msg}`);

        return msg;
    }

    private isLogIndicateFinished(line: string): boolean {
        if (line.indexOf(PUERTS_ERROR_KEYWORD) > 0) {
            return true;
        }
        else {
            return false;
        }
    }

    public getState(): EIssueDetectorState {
        return this.state;
    }
}