const nodemailer = require('nodemailer')

const emailOptions = {
    host: process.env['SMOLPRESS_SMTP_HOST'],
    port: process.env['SMOLPRESS_SMTP_PORT'],
    user: process.env['SMOLPRESS_SMTP_USER'],
    pwd: process.env['SMOLPRESS_SMTP_PWD'],
    from: process.env['SMOLPRESS_SMTP_FROM'],
    to: process.env['SMOLPRESS_SMTP_TO']
}

function mail(comment, page, config) {
    let transporter = nodemailer.createTransport({
        host: emailOptions.host,
        port: emailOptions.port,
        secure: false,
        auth: {
            user: emailOptions.user,
            pass: emailOptions.pwd,
        },
    });

    let info = transporter.sendMail({
        from: `"${comment.name}" <${emailOptions.from}>`,
        to: emailOptions.to,
        subject: `[smolpress] New comment on ${page.title}`,
        text: comment.text
    });
}

module.exports = {mail}