"""
Merges the trained LoRA adapter into the base Qwen2.5 model,
producing a single standalone model ready for GGUF conversion.
"""
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

BASE_MODEL    = "Qwen/Qwen2.5-1.5B-Instruct"
ADAPTER_PATH  = "fitx-lora-adapter"
MERGED_PATH   = "fitx-coach-merged"

print("=" * 60)
print("🔗 Merging LoRA adapter into base model")
print("=" * 60)

print("\n📥 Loading base model (full precision, not 4-bit this time)...")
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype = torch.float16,
    device_map  = "cpu",   # Merge on CPU to avoid VRAM issues
)
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
print("✅ Base model loaded")

print("\n🔗 Loading and merging LoRA adapter...")
model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
merged_model = model.merge_and_unload()
print("✅ Adapter merged into base model")

print(f"\n💾 Saving merged model to {MERGED_PATH}/...")
merged_model.save_pretrained(MERGED_PATH, safe_serialization=True)
tokenizer.save_pretrained(MERGED_PATH)
print("✅ Merged model saved!")

print("\n" + "=" * 60)
print("🎉 Merge complete! Next: convert to GGUF for Ollama")
print("=" * 60)
