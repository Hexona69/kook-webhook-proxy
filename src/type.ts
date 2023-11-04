export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never


export enum UserStatus {
    Normal_0 = 0,
    Normal_1 = 1,
    Banned = 10
}

export interface User {
    id: string,
    username: string,
    nickname: string,
    identify_num: string,
    online: boolean,
    bot: boolean,
    status: UserStatus,
    avatar: string,
    vip_avatar: string,
    mobile_verified: boolean,
    roles: number[]
}


export type GuildType = 'GROUP' | 'PERSON' | 'BROADCAST';

export enum MessageType {
    TextMessage = 1,
    ImageMessage = 2,
    VideoMessage = 3,
    FileMessage = 4,
    /**
     * @deprecated Not used by bot client
     */
    FriendAddedMessage = 5,
    /**
     * @deprecated Not used by bot client
     */
    VoiceChannelInvitationMessage = 6,
    /**
     * @deprecated Not used by bot client
     */
    UserJoinedGuildMessage = 7,
    AudioMessage = 8,
    MarkdownMessage = 9,
    CardMessage = 10,
    ActionMessage = 12,
    SystemMessage = 255
}
export type NormalMessageType = Exclude<MessageType,
    MessageType.SystemMessage |
    MessageType.FriendAddedMessage |
    MessageType.UserJoinedGuildMessage |
    MessageType.VoiceChannelInvitationMessage
>


export namespace WebSocket {
    export type Signals = Signal.Hello | Signal.Event | Signal.Ping | Signal.Pong | Signal.Resume | Signal.Reconnect | Signal.ResumeACK;
    export interface MessageQueue {
        0: Signal.Event[],
        1: Signal.Hello[],
        2: Signal.Ping[],
        3: Signal.Pong[],
        4: Signal.Resume[],
        5: Signal.Reconnect[],
        6: Signal.ResumeACK[],
    }
    export interface MessageTypes {
        0: Signal.Event,
        1: Signal.Hello,
        2: Signal.Ping,
        3: Signal.Pong,
        4: Signal.Resume,
        5: Signal.Reconnect,
        6: Signal.ResumeACK,
    }
    export enum SignalType {
        Event = 0,
        Hello = 1,
        Ping = 2,
        Pong = 3,
        Resume = 4,
        Reconnect = 5,
        ResumeACK = 6
    }
    export enum State {
        Initialization = 0,
        ConnectGateway = 1,
        ConnectionOpen = 2,
        RecievingMessage = 3,
        NeedsRestart = 255
    }
    export namespace Signal {
        export interface Hello {
            s: 1,
            d: {
                code: 0,
                session_id: string
            }
        }
        export interface Event {
            s: 0,
            d: NormalMessageEvent<NormalMessageType, GuildType> | SystemMessageEvent,
            sn: number
        }
        export interface Ping {
            s: 2,
            sn: number,
        }
        export interface Pong {
            s: 3
        }
        export interface Resume {
            s: 4,
            sn: number
        }
        export interface Reconnect {
            s: 5,
            d: {
                code: ReconnectReason,
                err: string
            }
        }
        export interface ResumeACK {
            s: 6,
            d: {
                session_id: string
            }
        }
    }

    export enum ReconnectReason {
        MissingParams = 40106,
        SessionExpired = 40107,
        SNInvalid = 40108
    }

    export interface MessageEvent {
        channel_type: GuildType,
        type: MessageType,
        target_id: string,
        author_id: string,
        content: any,
        msg_id: string,
        msg_timestamp: string,
        nonce: string,
        extra: any
    }

    interface MessageEventExtra {
        1: {
            type: MessageType.TextMessage,
            author: User
        }
        2: {
            type: MessageType.ImageMessage,
            author: User,
            attachments: {
                type: 'image',
                name: string,
                url: string
            }
        },
        3: {
            type: MessageType.VideoMessage,
            author: User,
            attachments: {
                type: "video",
                name: string,
                url: string,
                file_type: string,
                size: number,
                duration: number,
                width: number,
                height: number
            }
        },
        4: {
            type: MessageType.FileMessage,
            author: User,
            attachments: any
        },
        8: {
            type: MessageType.AudioMessage,
            author: User,
            attachments: any
        },
        9: {
            type: MessageType.MarkdownMessage,
            author: User
        },
        10: {
            type: MessageType.CardMessage,
            author: User
        }
        12: {
            type: MessageType.ActionMessage,
            author: User,
            kmakrdown: {
                mention: string[],
                mention_part: Array<any>,
                item_part: Items[]
            }
        }
    }
    interface MessageEventChannelTypeExtra<T extends NormalMessageType> {
        'GROUP': MessageEventExtra[T] & {
            guild_id: string,
            mention: any[],
            mention_all: boolean,
            mention_roles: any[],
            mention_here: boolean
        },
        'PERSON': MessageEventExtra[T],
        'BROADCAST': MessageEventExtra[T]
    }
    export interface NormalMessageEvent<T extends NormalMessageType, K extends GuildType> extends MessageEvent {
        channel_type: K,
        content: T extends MessageType.ActionMessage ? {
            type: 'item',
            data: {
                user_id: string,
                target_id: string,
                item_id: string
            }
        } : string,
        type: T,
        extra: MessageEventChannelTypeExtra<T>[K]
    }
    export type Items = PokeItem;
    export interface PokeItem {
        id: number,
        name: string,
        desc: string,
        cd: number,
        categories: string[],
        label: number,
        label_name: string,
        quality: number,
        icon: string,
        icon_thumb: string,
        icon_expired: string,
        quality_resouce: {
            color: string,
            small: string,
            big: string
        },
        resources: {
            type: 'ImageAnimation',
            preview_expired: string,
            webp: string,
            pag: string,
            gif: string,
            time: number,
            width: number,
            height: number,
            percent: number
        },
        msg_scenarios: {
            ABA: string,
            ABB: string,
            ABC: string,
            AAA: string,
            AAB: string
        }
    }
    export interface SystemMessageEvent extends MessageEvent {
        type: MessageType.SystemMessage,
        content: string,
        extra: {
            type: string,
            body: any
        }
    }

    export interface UserConnectToVoiceChannelEvent extends SystemMessageEvent {
        channel_type: "GROUP",
        extra: {
            type: 'joined_channel',
            body: {
                user_id: string,
                channel_id: string,
                joined_at: number
            }
        }
    }
    export interface UserDisconnectFromVoiceChannelEvent extends SystemMessageEvent {
        channel_type: "GROUP",
        extra: {
            type: "exited_channel",
            body: {
                user_id: string,
                channel_id: string,
                exited_at: number
            }
        }
    }
    export interface UserProfileUpdateEvent extends SystemMessageEvent {
        channel_type: "PERSON",
        extra: {
            type: "user_updated",
            body: {
                user_id: string,
                username: string,
                avatar: string
            }
        }
    }
    export interface SelfJoinedGuildEvent extends SystemMessageEvent {
        channel_type: "PERSON",
        extra: {
            type: "self_joined_guild",
            body: {
                guild_id: string
            }
        }
    }
    export interface SelfExitedGuildEvent extends SystemMessageEvent {
        channel_type: "PERSON",
        extra: {
            type: "self_exited_guild",
            body: {
                guild_id: string
            }
        }
    }
    export interface ButtonClickedEvent extends SystemMessageEvent {
        channel_type: "PERSON",
        extra: {
            type: "message_btn_click",
            body: {
                value: string,
                msg_id: string,
                user_id: string,
                target_id: string,
                user_info: User,
                channel_type: Exclude<GuildType, "BROADCAST">,
                guild_id?: string
            }
        }
    }
}

export namespace WebHook {
    type ChannelType = 'GROUP' | 'PERSON' | 'BOARDCAST' | 'WEBHOOK_CHALLENGE';

    export interface ChallengeEventData {
        channel_type: 'WEBHOOK_CHALLENGE',
        type: 255,
        challenge: string,
        verify_token: string
    }

    export interface NormalMessageEventData<T extends NormalMessageType, K extends GuildType> extends WebSocket.NormalMessageEvent<T, K> {
        verify_token: string
    }

    export interface SystemMessageEventData extends WebSocket.SystemMessageEvent {
        verify_token: string
    }

    export interface NormalMessageEvent<T extends NormalMessageType, K extends GuildType> {
        s: 0,
        sn: number,
        d: NormalMessageEventData<T, K>
    }
    export interface SystemMessageEvent {
        s: 0,
        sn: number,
        d: SystemMessageEventData
    }
    export interface ChallengeEvent {
        s: 0,
        d: ChallengeEventData
    }

    export type Events = NormalMessageEvent<NormalMessageType, GuildType> | SystemMessageEvent | ChallengeEvent;
}