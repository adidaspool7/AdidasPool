Apontamentos/correcções relatório Estágio
1-
TalentHub was the Talent Pool subproject of a four-team BlendEd
program;
This is not well explaining that the “four-team” are actually sub-teams, inside of the same team, which had adidas as client. We need to rephrase this just a bit better. 

2- do we have links on the document for the live app ?

3- The HR teams interviewed during
the discovery phase reported nine concrete pain points, summarised in Table 1.1.
it’s not Teams, but just one team. Please review all the document about this. Not a huge problem, but just to keep accuracy. There was ONE HR team of adidas involved on this project. 

4- page 4: Onboarding of hired employees1
where is the footnote “1” located ?

5- also on page 4, table 1.2
Recruitment analytics and custom widgets
there’s no “out of scope” equivalent

6- we make reference to the user guide (HR and candidate), right ?

7- we don’t have the JIRA backlog done/completed yet. This may be important if the supervisor asks. Let’s make a plan on how can I have this JIRA board completed with accurate info/cards/issues

8- I want references of the “answers” to my supervisor feedback on the report, so I can write him back with the the specific parts that were changed according to what he wrote me. This way he can assure that his feedback was taken into account. 

9- the two personas, Carla and Tiago, are mentioned on page 13 but were never referred again. Should we use these two names more times along the report or not needed?

10- regarding the GDPR… so the candidate profile is deleted after 6 months. What happens to the historic of candidate interaction? How does really a HR member knows if a candidate that is applying didn’t apply before if the data was deleted? Or is there some data that remains in the system, even after the 6 months GDPR rule? Page 14 refers this on “and recognising repeat applicants under theGDPR retention rule (#2)”
11- we could have a small paragraph that explains how the 4 sub-projects are connected:
1-	Community-research and employer-branding are mostly to attract new potential candidates
2-	Then they are forwared to the talenthubfor applications, analysis, communication, etc
3-	When a candidate is hired (or just before pre-hiring) we have the onboarding assistant
We can explain that the talenthub is a piece of the “framework” that the general team was asked to think and develop. 

12 – on figure 3.1 we are missing the use case of job-matching, which is requested by the HR member regarding the job and the candidates, and where the LLM provider also takes action

13- I feel that the part that I’m the product owner and my responsibilities are a bit repetitive. 

14- page 22: and a
dedicated client-acceptance session
We had more than one sessions, so please put this into plural. 

15- meeting minutes (Appendix C)
record the ceremonies
I need to double-check this. 
16- should I put a screenshot of the figma board, even though it will not be able to read nothing as it is so large?
17- 3.7.3 talks again about the backlog which I don’t have, but I should.
18- figure 3.2 
•	The testing, deployment bar can go a bit closer to July, let’s say end of June.
•	Final report and presentation should be only from mid June to July
•	There was another situation point on 24th march, so we need another green line
19- table 3.7 would be nice to add to the table’s title: Likelihood (L) and Impact (I)
20- Glossary: Whisper? Zod ? shadcn/ui ? tailwind CSS? Cookies? CORS? MIME? Vitest and V8? Turbopack? GIN index?
21- Second, a public
welcome page was added to the deployed application at the explicit request of the adidas
Design team
This is not very accurate, it was the design of my group/team that wanted/suggested to do this, not a designer team from adidas
22- still on 3.7.6, not need to repeat this “— a talent pool with communication verification, deliberately not a full ATS”
23- 3.8 Conclusion
It seems a bit small. Not that I want to repeat anything, but maybe we should have something more expanded ? just asking…
24- 4.1 “and Storage for uploaded CVs”. The Supabase Storage is only for the CV’s ? what about the candidates data? What about the ambassadors application videos? What about job application scrapped from adidas site?

25- the text “Figure 4.2 draws this as concentric layers: the dependency-free Domain at the centre, the
Application layer wrapping it, and Infrastructure and Presentation forming the outer shell.”
And “Figure 4.2: The onion architecture: a dependency-free Domain at the core, with
Application, Infrastructure and Presentation around it.” Are almost the same. Can we remove of make it very light the first sentence ?

26- page 27, “This
same separation is what later allowed the AI Interviewer to be extracted into its own process
behind an unchanged contract.” It feels that this is repeating again. We can remove this
27- could be interesting to add as future work that the AI interviews would be specific of each job position. HR could choose the some topics that they find as priorities for the candidates, and once the candidate applies for that job, the assessments/interviews would be available for the candidate to do. Do you understand my idea?
28- 4.4 (00000000000000_schema.sql)
we don’t need to have this file’s name

29- it would be great if the figure 4.3 would be before 4.4 database design
30- 4.5 “and is
recorded honestly as a limitation in Section 6.5.”
remove the word honesty or change it for something different
31- on figure 4.6 what are the “persist candidate + children” ?
32- the automatic time-based regarding the data deletion of candidates on future work is desxribed how it would be implemented or just as a feature that it would be nice to have ?
33- table 4.3 shouldn’t we add things like shadcn/ui and tailwind, as so as typescript and others to have this table more complete with the decision trade-offs? Vitest vs JEST
34- table 5.1 is in the middle of the 5.2 repository layout items
35- table 5.2 should be before 5.3 Talent Pool Module
36- supplied by the user are escaped before they reach the PostgREST .or() filter (Section 5.14),
closing the injection vector found during a security review.
this could be a nice example of a prompt engineering that helped me finding this potential security issue
DO we have it? If not, we can add it

37- this text: . Table 5.3 applies the mid-2026 published list prices of three small/fast
models to that token profile, and Figure 5.4 plots the cumulative cost as the number of parsed
CVs grows.

and the 5.3 title is practically a repetition one just after the other. 
38- 5.5 has:
which is the property the
client asked for under the heading of transparency.
This is not true, client didn’t ask this, we have thought that it was a good principle

39- 5.5 CV Scoring Engine
Once a CV is parsed, the candidate receives a deterministic quality score. The engine is a pure
domain service: the same input always produces the same output, which is the property the
client asked for under the heading of transparency. The overall score is a weighted sum of five
components, each normalised to the range 0–100, as set out in Table 5.4. Language proficiency
carries the largest weight of any single criterion (35%), reflecting the platform’s purpose as
a language-verification layer. Two of the components touch professional experience from
different angles: the 25% Experience weight stands in for role-relevant experience — only
meaningful once a specific job is in play, where the job-anchored fit (Section 5.6) replaces it
with LLM-assessed relevance — while the 10% Years of experience weight rewards raw tenure.
In the generic, job-agnostic score the former is proxied by the latter, which is why the worked
example below scores both alike.

In this paragraph we are not mentioning the location parameter. 
40- Because a full portal
sync can take the better part of a minute
I don’t like the “better part of a minute”, I prefer “about a minute”
41. 5.7 seems repetition on what was already mentioned about this. Maybe we can reduce the part where it was previously mentioned and leave this one as it is, or reduce this one and leave the previous. 
42.  A hand-written query service runs each validated specification, and a single universal
renderer turns the resulting {label, value} series into a bar, line, area, pie or stat chart.
Saved widgets are stored per user. This design gives HR analytical freedom while making it
impossible to express an injected or malformed query (Chapter 6).this is not implemented! It was a “nice to have”, and we can put it on future work.
We only have the selector of dimensions and then the chart is created. Please analyze code to check this up. 

43- Welcome and onboarding page. At the request of the client’s design team,
Already mentioned before, it was not the client’s design team
44- the application
opens on a branded welcome page that orients each visitor before authentication and, after
Google sign-in, routes them to the dashboard appropriate to their role. It states the platform’s
purpose in adidas terms and presents the two entry paths — recruiter and candidate
The order is not correct: heropage, then “presentation page” (where we choose to login as HR or candidate), then the Google login and then finally the talenthub inside (dashboard, CV parsing, etc)
45- I may need to replace/add some screenshots (candidate profile from the HR side, not from the candidate side as we have; the “presentation page”…)
46- figure 5.9 is in the middle of the text. It should appear after “reinforces the same role boundaries enforced by the middleware (Section 5.11).”
 47- image 5.10 is still too big and the title is not correct
48- Open positions
are browsed from a live feed that HR refreshes from the adidas careers portal through a sync
action backed by the scraper.
Are you sure about this? I thought that when a candidate hits sync of the job positions, it does sync, and it doesn’t gets the info from the HR refresh. Please check this better. 
49- not sure yet, because of possible changes, but if the last page of 5.14 stays with only that, we can add one or two mode code excerpts to fulfill more that page 52.

50- figure 6.1 title is too long and has repetition; this image should be shown just before the “the glue between layers”
51- nd the analytics catalog tests confirm that the strict widget-specification
schema rejects injected keys, so that the constrained chart builder can never be coerced into
running an arbitrary query.
same problem as already noted in this list

52- Performance was addressed pragmatically, at the points the data model makes hot.
I don’t like this expression “makes hot”


52- Validation also surfaced limitations that are reported here honestly rather than hidden.
There you are with the “Honest” again. Please change this expression here, together with the “hidden” word. 
53- table 6.1, 6.2 and 6.3 should be next to the tests parts. 
54- made deferral an explicit, defensible decision rather than a silent omission.
I don’t like silent omission. 
55- The honest takeaway is that
combining the
Honest AGAIN !!! OMFG !
56- The counter-lesson concerns the decision
to forgo an ORM
forgo ? what’s that? Change that word
57- Treating that use honestly
yielded its own lessons, and they were as much about the tool’s limits as its leverage.
honesty again….
58- from 7.3.3 I see a lot of bold…. Please remove them. We almost didn’t have them across the document and now we have a lot

59- Early prompts
were broad (“add feature X”), which is exactly when the context problem bites hardest:
fuck my life!! I can’t have this “add feature X”, you want my disgrace? Please review this paragraph/sentence to have something better.
60- can you explain me the “Bias detection” ?
61- I want to remove 2 items of the bibliography so that we keep it in 2 pages. Which 2 references you recommend to remove (less important) ?

