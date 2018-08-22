const inquirer = require('inquirer');
const configureKey = require('./apns-key-config');
const configureCertificate = require('./apns-cert-config');

const channelName = 'APNS';

async function configure(context) {
  const isChannelEnabled =
    context.exeInfo.serviceMeta.output[channelName] &&
    context.exeInfo.serviceMeta.output[channelName].Enabled;

  if (isChannelEnabled) {
    context.print.info(`The ${channelName} channel is currently enabled`);
    const answer = await inquirer.prompt({
      name: 'disableChannel',
      type: 'confirm',
      message: `Do you want to disable the ${channelName} channel`,
      default: false,
    });
    if (answer.disableChannel) {
      await disable(context);
    } else {
      const successMessage = `The ${channelName} channel has been successfully updated.`;
      await enable(context, successMessage);
    }
  } else {
    const answer = await inquirer.prompt({
      name: 'enableChannel',
      type: 'confirm',
      message: `Do you want to enable the ${channelName} channel`,
      default: true,
    });
    if (answer.enableChannel) {
      await enable(context);
    }
  }
}

async function enable(context, successMessage) {
  let channelOutput = {};
  if (context.exeInfo.serviceMeta.output[channelName]) {
    channelOutput = context.exeInfo.serviceMeta.output[channelName];
  }

  const APNSChannelRequest = { Enabled: true };

  const { DefaultAuthenticationMethod } = channelOutput;

  let keyConfig;
  let certificateConfig;

  const answers = await inquirer.prompt({
    name: 'DefaultAuthenticationMethod',
    type: 'list',
    message: 'Choose authentication method used for APNs',
    choices: ['Certificate', 'Key'],
    default: DefaultAuthenticationMethod || 'Certificate',
  });

  APNSChannelRequest.DefaultAuthenticationMethod = answers.DefaultAuthenticationMethod;

  if (APNSChannelRequest.DefaultAuthenticationMethod === 'Key') {
    keyConfig = await configureKey.run();
  } else {
    certificateConfig = await configureCertificate.run();
  }

  Object.assign(APNSChannelRequest, keyConfig, certificateConfig);

  const params = {
    ApplicationId: context.exeInfo.serviceMeta.output.Id,
    APNSChannelRequest,
  };

  return new Promise((resolve, reject) => {
    context.exeInfo.pinpointClient.updateApnsChannel(params, (err, data) => {
      if (err) {
        context.print.error('update channel error');
        reject(err);
      } else {
        if (!successMessage) {
          successMessage = `The ${channelName} channel has been successfully enabled.`;
        }
        context.print.info(successMessage);
        context.exeInfo.serviceMeta.output[channelName] = data.APNSChannelResponse;
        resolve(data);
      }
    });
  });
}

function disable(context) {
  const params = {
    ApplicationId: context.exeInfo.serviceMeta.output.Id,
    APNSChannelRequest: {
      Enabled: false,
    },
  };
  return new Promise((resolve, reject) => {
    context.exeInfo.pinpointClient.updateApnsChannel(params, (err, data) => {
      if (err) {
        context.print.error('update channel error');
        reject(err);
      } else {
        context.print.info(`The ${channelName} channel has been disabled.`);
        context.exeInfo.serviceMeta.output[channelName] = data.APNSChannelResponse;
        resolve(data);
      }
    });
  });
}

module.exports = {
  configure,
  enable,
  disable,
};
