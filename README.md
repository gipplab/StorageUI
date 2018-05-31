# StorageUI
Online Publishing System Utilizing Peer-2-Peer to Support Priority Claims and Data  Accessibility 

StorageUI is a scientific data publishing and conserving platform which
saves data replicated in a dynamic peer-to-peer cluster based on the Interplanetary Filesystem (IPFS).
The StorageUI cluster can dynamically grow and shrink. Any PC (node) with the minimal
can participate. StorageUI provides on any running node an user interface (UI) and an API,
which can be used to integrate the system in Electronic Publishing Systems and similiar systems.
Any submitted data will be Trusted Timestamped with [Originstamp.org](http://originstamp.org/home)

A testcluster and further explaination can be found here:  [StorageUI](http://192.52.3.143:3000/)

The API integration in a Online Publishing Management System can be found here
[CryptSubmit](https://iivooo.suhail.uberspace.de/ojs/)
## Setup

This project is node.js driven. Install it e.g. like this:
`sudo curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -;`
`sudo apt-get install -y nodejs;`

Afterwards set the global path for npm (node packet manager) to the userspace for permission issues:
`mkdir ~/.npm-global;`
`npm config set prefix '~/.npm-global';`
`echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile;`
`source ~/.profile;`

Now fetch this project to your server in any folder you like. A folder in the
userspace is recommended due to permission issues:
`git clone ...`

Now install all dependecies of the project. Go into the projects folder and hit:
`npm install`

To start the instance you can either run the native node server or use e.g. forever:
`npm install -g --save forever`
`forever start bin/www`

#### Important
The automatic clusterization mechanism isn't working yet and must be
done manually, because of problems with the implementations of the used
tools. But all problems are addressed and on the roadmap of the respective
 developers. The project is currently not under development.

The final idea is that every node can run StorageUI, orbit-db, IPFS and ipfs-cluster.
IPFS and ipfs-cluster must connect to some bootstrap servers to get the
addresses of the other participating nodes. The current test-setup runs
one StorageUI node and 2 backup nodes, which only run IPFS and ipfs-cluster.
StorageUI uses the JS implementation of IPFS to store the data and to run orbit-db.
The IPFS in StorageUI connects with the backupservers to replicate the data.
This would have been done all in StorageUI, but the compatibility with the
JS versions of IPFS, ipfs-cluster and orbit-db with the versions of the GO-implementations
aren't fully compatible yet.
It could be done with the GO implementations of ipfs-* but then orbit-db
can't be used. The ipfs-api module support for orbit-db will be established
in near future. This is the point when all functions can be ported to one node.

## Roadmap

If you want to participate: StorageUI is written in Node.js. It uses and follows the
basic setup of an Express-App in WebStorm (JetBrains).

1. Wait for orbit-db to work with ipfs-api module. And then accustom the code
to work with the GO version of IPFS

2. Wait for better implementations of ipfs-cluster. Especially the RAFT algorithm
must be more solid against errors when nodes just shut off without the leaving procedure.

3. Maybe write a little automatization script for the configuration of IPFS
and ipfs-cluster, including: Fetching the bootstrap servers from somwhere and
put them automatically into the respective configs. Also automatic installation
procedures and tool management (on/off in case of errors) could be written.
