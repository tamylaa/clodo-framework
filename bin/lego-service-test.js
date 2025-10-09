import { Command } from 'commander';
const program = new Command();

program
  .name('lego-service-test')
  .description('Test Lego Framework CLI')
  .version('1.0.0');

program
  .command('hello')
  .description('Say hello')
  .action(() => {
    console.log('Hello from Lego Service CLI!');
  });

program
  .command('create')
  .description('Create a new service')
  .action(() => {
    console.log('Create command would run here...');
  });

program.parse();