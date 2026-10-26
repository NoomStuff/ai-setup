---
name: continuation
description: ALWAYS intermittently check current usage limits, then if usage gets low or the user asks for a continuation load this skill.
---

# Continuations

If you have access to reading the current usage limits and scheduling new messages you may now schedule a continuation.

You will schedule a message in the current thread for 1 minute after the usage limits are back. Set it to loop at the same interval as rate limits refresh.

The message should say "continue" and nothing else.

When you believe the task is fully complete or you receive a continuation request when work is already done you may delete the sheduled message.