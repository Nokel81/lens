import React from "react"
import { action, observable } from "mobx"
import { autobind } from "../../utils"
import isObject from "lodash/isObject"
import uniqueId from "lodash/uniqueId"
import { JsonApiErrorParsed } from "../../api/json-api"

export type MessageId = string | number;
export type Message = React.ReactNode | React.ReactNode[] | JsonApiErrorParsed;

export interface Notification {
  id?: MessageId;
  message: Message;
  status?: "ok" | "error" | "info";
  timeout?: number; // auto-hiding timeout in milliseconds, 0 = no hide
}

@autobind()
export class NotificationsStore {
  public notifications = observable<Notification>([], { deep: false });

  protected autoHideTimers = new Map<MessageId, number>();

  addAutoHideTimer(notification: Notification): void {
    this.removeAutoHideTimer(notification)
    const { id, timeout } = notification
    if (timeout) {
      const timer = window.setTimeout(() => this.remove(id), timeout)
      this.autoHideTimers.set(id, timer)
    }
  }

  removeAutoHideTimer(notification: Notification): void {
    const { id } = notification
    if (this.autoHideTimers.has(id)) {
      clearTimeout(this.autoHideTimers.get(id))
      this.autoHideTimers.delete(id)
    }
  }

  @action
  add(notification: Notification): void {
    if (!notification.id) {
      notification.id = uniqueId("notification_")
    }
    const index = this.notifications.findIndex(item => item.id === notification.id)
    if (index > -1) this.notifications.splice(index, 1, notification)
    else this.notifications.push(notification)
    this.addAutoHideTimer(notification)
  }

  @action
  remove(itemOrId: MessageId | Notification): void {
    if (!isObject(itemOrId)) {
      itemOrId = this.notifications.find(item => item.id === itemOrId)
    }
    this.notifications.remove(itemOrId as Notification)
  }
}

export const notificationsStore = new NotificationsStore()
