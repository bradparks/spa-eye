/* See license.txt for terms of usage */

define([
    "firebug/lib/xpcom",
    "firebug/lib/trace"
],
function(Xpcom, FBTrace) {

// ********************************************************************************************* //
// Constants

        const Cc = Components.classes;
        const Ci = Components.interfaces;
        const Cr = Components.results;

        const NS_SEEK_SET = Ci.nsISeekableStream.NS_SEEK_SET;
        const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

        const nsHashService = Xpcom.CCSV("@mozilla.org/security/hash;1", "nsICryptoHash");
        const nsICryptoHash = Ci["nsICryptoHash"];

        var SHA = {};

// ********************************************************************************************* //
// Module Implementation

        SHA.getTextHash = function(text){
            try{
                nsHashService.init(nsICryptoHash.MD5);
                var source = text;

                var byteArray = [];
                for (var j = 0; j < source.length; j++){
                    byteArray.push( source.charCodeAt(j) );
                }

                nsHashService.update(byteArray, byteArray.length);
                var hash = nsHashService.finish(true);

                if (FBTrace.DBG_SPA_EYE && text.length > 1){
                    FBTrace.sysout("spa_eye; created hash for "+text.substr(30)+" is "+hash);
                }
            } catch (e) {
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("SHA generation FAILS for " + text, e);
            }

            return hash;
        }
// ********************************************************************************************* //
// Registration

        return SHA;

// ********************************************************************************************* //
});