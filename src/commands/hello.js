const { Command } = require('@oclif/command')

class HelloCommand extends Command {
  async run() {
    this.log('Omg hi!')
  }
}

HelloCommand.description = `Want to say hi?
...
Why not say hi to get started!
`

HelloCommand.flags = {}

module.exports = HelloCommand
