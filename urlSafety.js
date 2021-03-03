/**
 * Algorithm to check if a URL is safe to use.
 */

/**
 * Checks if a URL is safe to use, and returns a string indicating the analysis result:
 * 
 * - "ok" if the URL is allowed,
 * - "download" if the URL is a download link or a media file,
 * - "email" if the URL is an email link,
 * - "unhandled" if the URL is forbidden or unknown,
 * 
 * @param {String} url 
 * @return {String} - The safety status of the URL.
 */
function checkUrlSafety(url) {
    // check the url via regular expressions
    if (checkUrlAgainstPatterns(url, url_download)) {
        return "download";
    } else if (checkUrlAgainstPatterns(url, url_email)) {
        return "email";
    }
    else if (checkUrlAgainstPatterns(url, url_forbidden)) {
        return "unhandled";
    }
    else if (checkUrlAgainstPatterns(url, url_allowed)) {
        return "ok";
    }
    
    return "unhandled";
}

/**
 * Checks if a URL against an array of regular expression patterns and return true if it matches any of them.
 * 
 * @param {String} url - The URL to check.
 * @param {Array} patterns - An array of regex patterns to match against the URL.
 * @return {Boolean} - Returns "download" if the URL matches any download or media file patterns.
 */
function checkUrlAgainstPatterns(url, patterns) {
    for (let pattern of patterns) {
        if (pattern.test(url)) {
            return true;
        }
    }
    return false;
}

/** 
 * Array of regular expression patterns to match download links and media files.
 */
let url_download = [
    // prefix
    /^ftp:\/\//i,
    /^sftp:\/\//i,
    
    // suffix
    /\.zip$/i,
    /\.zip[?#]/i,
    /\.tar$/i,
    /\.tar[?#]/i,
    /\.sit$/i,
    /\.sit[?#]/i,
    /\.dmg$/i,
    /\.dmg[?#]/i,
    /\.gz$/i,
    /\.gz[?#]/i,
    /\.tgz$/i,
    /\.tgz[?#]/i,
    /\.exe$/i,
    /\.exe[?#]/i,

    /\.mov$/i,
    /\.mov[?#]/i,
    /\.mpeg$/i,
    /\.mpeg[?#]/i,
    /\.mpg$/i,
    /\.mpg[?#]/i,
    /\.wmv$/i,
    /\.wmv[?#]/i,
    /\.mp3$/i,
    /\.mp3[?#]/i,
    /\.ram$/i,
    /\.ram[?#]/i,
    /\.rm$/i,
    /\.rm[?#]/i,

    /\.pdf$/i,
    /\.pdf[?#]/i,
    /\.rtf$/i,
    /\.rtf[?#]/i,
    /\.doc$/i,
    /\.doc[?#]/i,
    /\.xls$/i,
    /\.xls[?#]/i,
    /\.ppt$/i,
    /\.ppt[?#]/i,
    /\.vcf$/i,
    /\.vcf[?#]/i
]

/** 
 * Array of regular expression patterns to match an email link
 */
let url_email = [
    /^mailto:/i
]

/** 
 * Array of regular expression patterns to match explicitly allowed URLs.
 * All other URLs will be considered forbidden.
 */
let url_allowed = [
    /^http:\/\//i,
    /^https:\/\//i
]

/**
 * Array of regular expression patterns to match forbidden URLs.
 */
let url_forbidden = [
    // praefix
    /^file:\/\//i,
    /^#/i,
    /^javascript/i,
    /^onclick/i,
    
    // in the content
    /127.0.0.1/i,
    /localhost\//i,
    /pici.picidae.net\//i,
    /\.local\//i
]

// make functions available for other nodejs modules
module.exports.checkUrlSafety = checkUrlSafety;
