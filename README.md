Introduction
============

The manager api controls how applications and chains are managed on device. It is responsible for starting, stopping,
restarting, installing, and uninstalling all applications, chains, and data.

---------

Getting Started

*Prerequisites: `node`.*

  1. Run `make install`
  1. Run `npm start'
  1. Set environmental variables:
     
     Must haves, the top-level dirs on file-system:
     ```
     SETTINGS_FILE: location of user settings, defaults to /settings/settings.json',

     USER_PASSWORD_FILE: location of the user account password, defaults to '/accounts/user.json',
     
     CANONICAL_YML_DIRECTORY: location of the known YML files, defaults to './resources',
     ```
 
     Optional, at your discretion: 
     ```
       SYSTEM_USER: user for auth, defaults to admin
       
       ENVIRONMENT: DEV, to disable auth 
       
       DISABLE_YML_UPDATE: to disable the system from updating YMLs
       
       JWT_EXPIRATION: the number of seconds generated JWT tokens are valid, defaults to 3600
       
       SERIAL: id of the device, has various fallback defaults. Used for logging.
       
       TAG: architecture for any service the manager will launch, defaults to 'arm'

       JWT_PRIVATE_KEY_FILE: location of the RSA private key for JWT sigining. Defaults to './resources/jwt.key' 
        and will regenerate itself on each run. 
       
       JWT_PUBLIC_KEY_FILE: location of the RSA public key for JWT verification. Defaults to|| './resources/jwt.pem' 
        and will regenerate itself on each run.  
     ```


