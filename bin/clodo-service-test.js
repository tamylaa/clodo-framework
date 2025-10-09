import { Command } from 'commander';
const program = new Command();

program
  .name('clodo-service-test')
  .description('Test Clodo Framework CLI')
  .version('1.0.0');

program
  .command('hello')
  .description('Say hello')
  .action(() => {
    console.log('Hello from Clodo Service CLI!');
  });

program
  .command('create')
  .description('Create a new service')
  .action(() => {
    console.log('Create command would run here...');
  });

program.parse();