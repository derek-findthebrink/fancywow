const { Command, flags } = require('@oclif/command')
const prettyjson = require('prettyjson')

const { Client } = require('../clients/asana')

const list = (col) => col.map((x) => x.name)

class TasksCommand extends Command {
  async run() {
    try {
      this.client = new Client()
      const { flags } = this.parse(TasksCommand)
      if (flags.list) {
        if (flags.todo) {
          const tasks = await this.getToDoTasks()
          this.log(prettyjson.render(list(tasks)))
        }
      }
      this.log('Nothing to do!')
    } catch (error) {
      this.error(error, { exit: 1 })
    }
  }

  async getToDoTasks() {
    try {
      const tasks = await this.client.getToDoTasks()
      return tasks
    } catch (error) {
      this.exit(error, { exit: 1 })
    }
  }
}

TasksCommand.description = `Describe the command here
...
Extra documentation goes here
`

TasksCommand.flags = {
  list: flags.boolean({ char: 'l', description: 'List tasks'}),
  todo: flags.boolean({ char: 't', description: 'to do items only' }),
}

module.exports = TasksCommand
