#!/bin/env node

//  OpenShift Geospatial Node application
var express = require('express');
var fs      = require('fs');
var mongodb = require('mongodb');
var routes = require('routes');

/**
 *  Define the nodejs application.
 */
var NodeApp = function() {

	//  Scope.
	var self = this;

    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {

		// Mongo environment variables
		
		self.dbServer = new mongodb.Server(process.env.OPENSHIFT_MONGODB_DB_HOST,
	                              parseInt(process.env.OPENSHIFT_MONGODB_DB_PORT));

		self.db = new mongodb.Db(process.env.OPENSHIFT_APP_NAME, self.dbServer, {auto_reconnect: true, safe: false});

		self.dbUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
		self.dbPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;
		
		self.coll = 'zips';
		
		//  Web app environment variables

		self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP;
		self.port      = process.env.OPENSHIFT_INTERNAL_PORT || 8080;

		if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
		};

	} /* setupVariables */

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    } /* terminator */

    /**
     *  Set termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    } /* termination handlers */


    /*  ================================================================  */
    /*  App server functions (main app logic).                            */
    /*  ================================================================  */

    /**
     *  Initialize the server (express) and create the routes using
     *  module routes.js, and then register the handlers.
     */
    self.initializeServer = function() {
        routes(self);
        self.app = express();

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    } /* initialize server */


    /**
     *  Initialize application.
     */
    self.initialize = function() {
        self.setupVariables();
        //self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    } /* initialize app */


	/**
	  *  Start the server and the application.
	  */
	self.start = function() {

		//  Start the app on the specific interface (and port).
		console.log('%s self.start entered', Date(Date.now()) );

		self.app.listen(self.port, self.ipaddress, function() {
			console.log('%s: Node server started on %s:%d ...',
				Date(Date.now() ), self.ipaddress, self.port);
		});
	} /* app start */

	/**
	 *  Connect db and then callback to start the application.
	 */
	self.connectDb = function(appStart) {
		self.db.open(function(err, db) {
			if (err) { throw err; }
			self.db.authenticate(self.dbUser, self.dbPass,  function(err, result) {
				if (err) { throw err; }
			});
			appStart();
		});
	} /* Connect db */

}   /* Application.  */

/*  ================================================================  */
/*  Main                                                              */
/*  ================================================================  */
var theApp = new NodeApp();
theApp.initialize();
theApp.connectDb(theApp.start);

