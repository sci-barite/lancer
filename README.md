# Lancer

The code will not work as it is, since it refers to a specific sheet that can't be shared, via functions that are not on the repo.

To make it work, put your own sheet ID in the SpreadsheetApp.openById() functions, replacing the function calls within them.

In addition, this doesn't do anything by itself: it's designed to get data from my Sylph Chrome Extension (https://github.com/sci-barite/sylph) which also needs a deployed version of this app to work.

To deploy it, you need to use CLASP by Google, which also transpiles the TypeScript into JavaScript/GAS.
You would first need to push it to your own Google Apps Script project (you can create one at https://script.google.com/), and then deploy it as a web app.

After doing so, you would need to insert the public URL of the deployment as a "LancerWebApp" constant declared inside a lancer.ts file, within Sylph's src folder.

Then, finally, it would work, although it would still probably fail due to your sheet being different. :)

Bottom line: DIY! 😂
