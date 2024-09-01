const builder = require('electron-builder');
const Platform = builder.Platform;

const config = {
  targets: Platform.current().createTarget(),
  config: {
    appId: 'com.yourcompany.gitgui',
    productName: 'Git GUI',
    /* You can add more configuration here */
  }
};

builder.build(config)
  .then((result) => {
    console.log('Build successful:', result);
  })
  .catch((error) => {
    console.error('Build failed:', error);
  });