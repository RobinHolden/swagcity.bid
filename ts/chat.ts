function splitN(str: string, separator: string, limit: number) {
    const result = str.split(separator);
    return limit > 0 ? result.slice(0, limit - 1).concat(result.slice(limit - 1).join(separator)) : result;
}

class Auth {
    user: User;
    auth: HTMLElement;
    usernameBox: HTMLInputElement;

    constructor(user: User, handler: Function, auth: HTMLElement, usernameBox: HTMLInputElement) {
        this.user = user;
        this.auth = auth;
        this.usernameBox = usernameBox;

        this.usernameBox.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                handler(this);
            }
        });
    }
}

class User {
    name: string;
}

class OnlineList {
    onlineList: HTMLElement;
    onlineUsers: HTMLElement;

    constructor() {
        this.onlineList = new Elem("div", [new Attribute("class", "onlineList")], "Online users:").toHTML();
        this.onlineUsers = new Elem("ul", [new Attribute("id", "onlineUsers")], "").toHTML();
        this.onlineList.append(this.onlineUsers);
    }

    add(user: string) {
        this.onlineUsers.append((new Elem("li", [new Attribute("id", user)], user)).toHTML());
    }
    
    remove(user: string) {
        document.getElementById(user)?.remove();
    }
}

class Chat {
    chat: HTMLElement;

    constructor() {
        this.chat = document.createElement("div");
    }
}

class ChatInput {
    chatInput: HTMLInputElement;

    constructor(handler: Function, focus: Boolean) {
        this.chatInput = document.createElement("input");
        this.chatInput.type = "text";
        this.chatInput.placeholder = "Type your message here";
        this.chatInput.addEventListener("keydown", event => {
            if (event.key === "Enter" && this.chatInput.value.length > 0) {
                handler(this);
            }
        });
        if (focus === true) {
            document.addEventListener('keydown', event => {
                if (event.target !== this.chatInput) {
                    this.chatInput.focus();
                }
            });
        }
    }

    static toMessage(str: string, id: string) {
        if (str[0] === '/' && str.length > 1) {
            const fields = splitN(str, " ", 2);
            if (fields.length < 2) { // No argument
                return new Message(fields[0].slice(1), id, "");
            }
            return new Message(fields[0].slice(1), id, fields[1]);
        }
        return new Message("bcast", id, str);
    }
}

class Elem {
    tag: string;
    attributes: Attribute[];
    str: string;

    constructor(tag: string, attributes: Attribute[], str: string) {
        this.tag = tag;
        this.attributes = attributes;
        this.str = str;
    }

    toHTML() {
        const html = document.createElement(this.tag);
        for (const attribute of this.attributes) {
            html.setAttribute(attribute.name, attribute.value);
        }
        html.innerHTML = this.str;
        return html;
    }
}

class Attribute {
    name: string;
    value: string;

    constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
    }
}

class Handler {
    htmlModifiers: Map<string, HtmlModifier>;

    constructor(htmlModifiers: Map<string, HtmlModifier>) {
        this.htmlModifiers = htmlModifiers;
    }

    handle(msg: Message) {
        const htmlModifier = this.htmlModifiers.get(msg.cmd);
        if (htmlModifier !== undefined) {
            htmlModifier.modifier(htmlModifier.html, msg);
        }
    }
}

class HtmlModifier {
    html: HTMLElement | null;
    modifier: Function;

    constructor (html: HTMLElement | null, modifier: Function) {
        this.html = html;
        this.modifier = modifier;
    }
}

class Message {
    cmd: string;
    id: string;
    body: string;

    constructor(cmd: string, id: string, body: string) {
        this.cmd = cmd;
        this.id = id;
        this.body = body;
    }

    toSockData() {
        return new SockData(this.cmd + ":" + this.id + ":" + this.body);
    }
}

class SockData {
    str: string;

    constructor(str: string) {
        this.str = str;
    }

    toMessage() {
        const fields = splitN(this.str, ":", 3);
        if (fields.length < 3) {
            throw new SyntaxError("malformed socket data");
        }
        return new Message(fields[0], fields[1], fields[2]);
    }
}

class IdGenerator {
    #id: number;

    constructor() {
        this.#id = 1;
    }

    next() {
        if (this.#id == Number.MAX_SAFE_INTEGER) { // Should be checked
            this.#id = 1;
        }
        return String((this.#id)++);
    }
}

/* Main */
const socket = new WebSocket("wss://swagcity.bid/ws");
const main = document.getElementById("main");
if (main === null) {
    throw new Error("main element id not found");
}
const onlineList = new OnlineList();
const chat = new Chat();
const idGenerator = new IdGenerator();

const receiveHandlers = new Map();
receiveHandlers.set("bcast", new HtmlModifier(chat.chat, (html: HTMLElement, msg: Message) => {
    html.appendChild((new Elem("div", [new Attribute("class", "chatMessage")], msg.body)).toHTML());
}));
receiveHandlers.set("date", new HtmlModifier(chat.chat, (html: HTMLElement, msg: Message) => {
    html.appendChild((new Elem("div", [new Attribute("class", "chatMessage")], msg.body)).toHTML());
}));
receiveHandlers.set("dm", new HtmlModifier(chat.chat, (html: HTMLElement, msg: Message) => {
    html.appendChild((new Elem("div", [new Attribute("class", "chatMessage")], msg.body)).toHTML());
}));
receiveHandlers.set("error", new HtmlModifier(null, (html: null, msg: Message) => {
    console.log(msg.toSockData().str);
}));
receiveHandlers.set("online", new HtmlModifier(onlineList.onlineUsers, (html: HTMLElement, msg: Message) => {
    for (const user of msg.body.split('\n').filter(Boolean)) {
        html.appendChild((new Elem("li", [new Attribute("id", user)], user)).toHTML());
    }
}));
const receiveHandler = new Handler(receiveHandlers);

const sendHandlers = new Map();
sendHandlers.set("bcast", new HtmlModifier(null, (html: null, msg: Message) => {
    socket.send(msg.toSockData().str);
}));
sendHandlers.set("date", new HtmlModifier(null, (html: null, msg: Message) => {
    socket.send(msg.toSockData().str);
}));
sendHandlers.set("dm", new HtmlModifier(null, (html: null, msg: Message) => {
    socket.send(msg.toSockData().str);
}));
sendHandlers.set("online", new HtmlModifier(null, (html: null, msg: Message) => {
    ; // ignore
}));
const sendHandler = new Handler(sendHandlers);

const chatInput = new ChatInput((instance: ChatInput) => {
    sendHandler.handle(ChatInput.toMessage(instance.chatInput.value, idGenerator.next()));
    instance.chatInput.value = "";
}, true);

const authElem = document.getElementById("auth");
const usernameBoxElem = <HTMLInputElement>document.getElementById("usernameBox");
if (authElem === null || usernameBoxElem === null) {
    throw new Error("auth or usernameBox element id not found");
}
const auth = new Auth(new User(), (instance: Auth) => {
    instance.user.name = instance.usernameBox.value;
    instance.auth.remove();
    main.append(onlineList.onlineList);
    main.append(chat.chat);
    main.append(chatInput.chatInput);
    socket.onmessage = (event) => {
        console.log("Received: " + event.data);
        receiveHandler.handle((new SockData(event.data)).toMessage());
    }
    socket.send(instance.user.name);
}, authElem, usernameBoxElem);

/* Socket error stuff */
socket.onclose = (event) => {
    alert(`Connection to WSS server closed. Possible reasons:
- You entered wrong credentials on authentication
- The remote WSS server is down
- You have been timed out
- There was a client-side or server-side error`);
    console.log("Connection to WSS server closed.");
    console.log("Reason:", event.reason);
    console.log("Code:", event.code);
    console.log("Was clean:", event.wasClean);
}

socket.onerror = (event) => {
    console.log("Error in WSS.");
}

socket.onopen = (event) => {
    console.log("Connection with WSS server successfully established.");
}
