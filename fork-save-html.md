# Fork: wait for and save client side rendered HTML

I need to try something new.
A new functionality that  follows the same logic up to `page.waitForSelector(waitFor...`
but instead of visiting all links present in the pages, it grabs the HTML inside selector and returns exactly that as the output
(the full HTML present inside of selector once wait-for is detected) and does not open every href.
(I'll use that chunk of HTML later).
This new use case will probably be a fork of this app that instead of link harvesting, it wortks on single page depths just to wait for specific content to load and to grabs the desired HTML. For now, make 