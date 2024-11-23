/** @type {import('next').NextConfig} */
const nextConfig = {

    //Uncomment this if want to save previous page as cache for 30 seconds, but if page needs to be updated frequently, no need to use this
    // experimental: {
    //     staleTimes: {
    //         dynamic: 30,
    //     },
    // },

    // lucia auth needs this in order to work.
    serverExternalPackages: ["@node-rs/argon2"]
};

export default nextConfig;
