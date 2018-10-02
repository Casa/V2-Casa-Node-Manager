const passport = require('passport');
const passportJWT = require('passport-jwt');
const passportHTTP = require('passport-http');
const bcrypt = require('bcrypt');
const constants = require('utils/const.js');
const diskLogic = require('logic/disk.js');
const NodeError = require('models/errors.js').NodeError;

var JwtStrategy = passportJWT.Strategy;
var BasicStrategy = passportHTTP.BasicStrategy;
var ExtractJwt = passportJWT.ExtractJwt;

const saltRounds = 10;

// TODO: use system based variable - mac awk system_profiler, linux awk /proc/info
const SYSTEM_USER = process.env.SYSTEM_USER || 'admin';
const JWT_AUTH = 'jwt';
const REGISTRATION_AUTH = 'register';
const BASIC_AUTH = 'basic';

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
  secretOrKey: constants.SHARED_JWT_SECRET
};

passport.serializeUser(function(user, done) {
  if (user.id) {
    return done(null, user.id);
  }

  return done(null, SYSTEM_USER);
});

passport.use(BASIC_AUTH, new BasicStrategy(function(username, password, next) {
  return next(null, {password: password, username: SYSTEM_USER}); // eslint-disable-line object-shorthand
}));

passport.use(JWT_AUTH, new JwtStrategy(jwtOptions, function(jwtPayload, done) {
  return done(null, {id: jwtPayload.id});
}));

passport.use(REGISTRATION_AUTH, new BasicStrategy(function(username, password, next) {
  bcrypt.hash(password, saltRounds).then(function(hash) {
    return next(null, {password: hash, username: SYSTEM_USER});
  });
}));

function basic(req, res, next) {
  passport.authenticate(BASIC_AUTH, {session: false}, function(error, user) {

    function handleCompare(equal) {
      if (!equal) {
        return next(new NodeError('Incorrect password', 401)); // eslint-disable-line no-magic-numbers
      }
      req.logIn(user, function(err) {
        if (err) {
          return next(new NodeError('Unable to authenticate', 401)); // eslint-disable-line no-magic-numbers
        }
        delete user.password;

        return next(null, user);
      });
    }

    diskLogic.readUserFile()
      .then(userData => {
        const storedPassword = userData.password;

        if (error || user === false) {
          return next(new NodeError('Invalid state', 401)); // eslint-disable-line no-magic-numbers
        }

        bcrypt.compare(user.password, storedPassword)
          .then(handleCompare)
          .catch(next);
      })
      .catch(() => next(new NodeError('No user registered', 401))); // eslint-disable-line no-magic-numbers
  })(req, res, next);
}

function jwt(req, res, next) {
  passport.authenticate(JWT_AUTH, {session: false}, function(error, user) {
    if (error || user === false) {
      return next(new NodeError('Invalid JWT', 401)); // eslint-disable-line no-magic-numbers
    }
    req.logIn(user, function(err) {
      if (err) {
        return next(new NodeError('Unable to authenticate', 401)); // eslint-disable-line no-magic-numbers
      }

      return next(null, user);
    });
  })(req, res, next);
}

function register(req, res, next) {
  passport.authenticate(REGISTRATION_AUTH, {session: false}, function(error, user) {
    if (error || user === false) {
      return next(new NodeError('Invalid state', 401)); // eslint-disable-line no-magic-numbers
    }
    req.logIn(user, function(err) {
      if (err) {
        return next(new NodeError('Unable to authenticate', 401)); // eslint-disable-line no-magic-numbers
      }

      return next(null, user);
    });
  })(req, res, next);
}

function dev(req, res, next) {
  req.user = {username: 'dev', password: 'dev', id: 'dev'};

  return next(null, {user: 'dev', password: 'dev', id: 'dev'});
}

if (process.env.ENVIRONMENT === 'DEV') {
  module.exports = {
    basic: dev,
    jwt: dev,
    register: dev
  };
} else {
  module.exports = {
    basic,
    jwt,
    register,
  };
}
