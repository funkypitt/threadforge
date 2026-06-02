import { registerThreadsIpc } from './threads.ipc'
import { registerTweetsIpc } from './tweets.ipc'
import { registerMediaIpc } from './media.ipc'
import { registerPostingIpc } from './posting.ipc'
import { registerScheduleIpc } from './schedule.ipc'
import { registerAiIpc } from './ai.ipc'
import { registerSettingsIpc } from './settings.ipc'
import { registerSourcesIpc } from './sources.ipc'

export function registerAllIpc(): void {
  registerThreadsIpc()
  registerTweetsIpc()
  registerMediaIpc()
  registerPostingIpc()
  registerScheduleIpc()
  registerAiIpc()
  registerSettingsIpc()
  registerSourcesIpc()
}
