module.exports = {
  packagerConfig: {
    icon: '/home/mak/Documents/GitHub/AVP/src/Styles/images/icon',
    asar: false,
    executableName: "avp"
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: '/home/mak/Documents/GitHub/AVP/src/Styles/images/icon.png'
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ]

};
