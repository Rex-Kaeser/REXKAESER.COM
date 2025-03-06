function HireMe()
{
    var email = "rex@mines.edu";
    var subject = "Inquiry About Hiring Rex Kaeser";
    var body = "I came across your work and am interested in discussing a potential opportunity to collaborate with you. Please let me know your availability and if we can set up a time to discuss this further. Looking forward to hearing from you!";


    window.open("mailto:" + email + "?subject=" + subject + "&body=" + body, '_blank')
}