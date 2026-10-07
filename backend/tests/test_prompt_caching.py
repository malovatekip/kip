"""
Tests for the prompt-cache structure of the K-BIG-1 / K-BIG-2 system prompts.

Prompt caching is a prefix match, so two things must hold:
  1. Splitting the prompt into blocks changes nothing the model sees
     (the blocks concatenate back to the original prompt, byte for byte).
  2. The cached block is byte-identical across requests, and nothing per-request
     leaks into it -- otherwise every request writes a new cache entry and none
     are ever read (a silent cost increase, not an error).

Runs under pytest or directly:  python tests/test_prompt_caching.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import kip_prompt as p1
from app.services import kip_prompt_v2 as p2

VOLATILE_CASES = [
    dict(),
    dict(retrieved_knowledge="RK: copper price is high"),
    dict(town_profile="Kitwe: Copperbelt hub", user_idea_history="  - Green Basket (agriculture)"),
    dict(retrieved_knowledge="RK", town_profile="TP", user_idea_history="IH"),
]
BEMBA_SUFFIX = "\n\nIMPORTANT LANGUAGE INSTRUCTION: Respond in Bemba."


def _text(blocks):
    return "".join(b["text"] for b in blocks)


def test_kbig1_blocks_reproduce_the_original_prompt_exactly():
    for kw in VOLATILE_CASES:
        for suffix in ("", BEMBA_SUFFIX):
            blocks = p1.build_system_blocks(**kw, suffix=suffix)
            assert _text(blocks) == p1.build_system_prompt(**kw) + suffix, (kw, suffix)


def test_kbig2_blocks_reproduce_the_original_prompt_exactly():
    for kw in VOLATILE_CASES:
        blocks = p2.build_system_blocks_v2(**kw)
        assert _text(blocks) == p2.build_system_prompt_v2(**kw), kw


def test_exactly_one_breakpoint_on_the_first_block():
    for blocks in (p1.build_system_blocks(retrieved_knowledge="x", suffix=BEMBA_SUFFIX),
                   p2.build_system_blocks_v2(retrieved_knowledge="x", town_profile="y")):
        marked = [i for i, b in enumerate(blocks) if "cache_control" in b]
        assert marked == [0]                         # one breakpoint, well under the API max of 4
        assert blocks[0]["cache_control"] == {"type": "ephemeral"}


def test_cached_block_is_identical_across_different_requests():
    """The cache key is the prefix bytes: the first block must not vary with the request."""
    a = p1.build_system_blocks(retrieved_knowledge="A", town_profile="Lusaka", user_idea_history="i1")[0]["text"]
    b = p1.build_system_blocks(retrieved_knowledge="B", suffix=BEMBA_SUFFIX)[0]["text"]
    assert a == b
    c = p2.build_system_blocks_v2(retrieved_knowledge="A", town_profile="Lusaka")[0]["text"]
    d = p2.build_system_blocks_v2(user_idea_history="different history")[0]["text"]
    assert c == d


def test_volatile_text_never_enters_the_cached_block():
    kb = p1.build_system_blocks(retrieved_knowledge="UNIQUE-RK", town_profile="UNIQUE-TP",
                                user_idea_history="UNIQUE-IH", suffix="UNIQUE-SUFFIX")
    for token in ("UNIQUE-RK", "UNIQUE-TP", "UNIQUE-IH", "UNIQUE-SUFFIX"):
        assert token not in kb[0]["text"] and token in kb[1]["text"], token
    kb2 = p2.build_system_blocks_v2(retrieved_knowledge="UNIQUE-RK", town_profile="UNIQUE-TP",
                                    user_idea_history="UNIQUE-IH")
    for token in ("UNIQUE-RK", "UNIQUE-TP", "UNIQUE-IH"):
        assert token not in kb2[0]["text"] and token in kb2[1]["text"], token


def test_no_empty_text_blocks():
    """The API rejects empty text blocks; with no volatile content there is just one block."""
    for blocks in (p1.build_system_blocks(), p2.build_system_blocks_v2()):
        assert len(blocks) == 1
        assert all(b["text"].strip() for b in blocks)


def test_prefix_is_big_enough_to_cache():
    """Below the model's minimum cacheable size the marker is silently ignored. Measured with
    the real tokenizer: K-BIG-1 ~1.35K tokens (min 1024, Sonnet 4.6), K-BIG-2 ~2.3K (min 1024,
    Sonnet 5). Guard in characters (~3.5 chars/token worst case) so shrinking a prompt below the
    minimum is caught here rather than discovered on the bill."""
    assert len(p1.build_system_blocks()[0]["text"]) > 1024 * 3.5
    assert len(p2.build_system_blocks_v2()[0]["text"]) > 1024 * 3.5


if __name__ == "__main__":
    tests = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"PASS {name}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {name}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
