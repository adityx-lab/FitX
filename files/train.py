import json
import time
import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, TaskType
from trl import SFTTrainer
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig,
)

print("=" * 60)
print("🏋️  FitX AI Coach — Fine-Tuning Script (HuggingFace PEFT)")
print("=" * 60)

# ── Config ────────────────────────────────────────────────────
MODEL_NAME    = "Qwen/Qwen2.5-1.5B-Instruct"
MAX_SEQ_LEN   = 512
DATASET_PATH  = "files/fitx_coach_dataset_FINAL.json"
OUTPUT_DIR    = "./fitx-model"
EPOCHS        = 3

# ── Step 1: Load model in 4-bit ───────────────────────────────
print("\n📥 Loading Llama 3.2 1B in 4-bit quantization...")
print("   First run downloads ~700MB — please wait.\n")

bnb_config = BitsAndBytesConfig(
    load_in_4bit              = True,
    bnb_4bit_quant_type       = "nf4",
    bnb_4bit_compute_dtype    = torch.float16,
    bnb_4bit_use_double_quant = True,
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config = bnb_config,
    device_map          = "auto",
    torch_dtype         = torch.float16,
)
model.config.use_cache = False
model.enable_input_require_grads()  # Fixes gradient flow with quantization + checkpointing
print("✅ Base model loaded!")

# ── Step 2: Add LoRA adapters ─────────────────────────────────
print("\n⚡ Adding LoRA adapters...")

lora_config = LoraConfig(
    r              = 16,
    lora_alpha     = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj"],
    lora_dropout   = 0.05,
    bias           = "none",
    task_type      = TaskType.CAUSAL_LM,
)

model = get_peft_model(model, lora_config)

trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total     = sum(p.numel() for p in model.parameters())
print(f"✅ LoRA ready — training {trainable:,} of {total:,} parameters ({100*trainable/total:.2f}%)")

# ── Step 3: Load dataset ──────────────────────────────────────
print(f"\n📚 Loading dataset from {DATASET_PATH}...")

with open(DATASET_PATH, "r") as f:
    raw_data = json.load(f)

print(f"   Loaded {len(raw_data)} examples")

PROMPT_TEMPLATE = """Below is an instruction from a FitX fitness app user. Write a helpful, accurate, and concise response as a professional fitness coach.

### Instruction:
{instruction}

### Response:
{response}"""

def format_example(example):
    text = PROMPT_TEMPLATE.format(
        instruction = example["instruction"],
        response    = example["output"],
    ) + tokenizer.eos_token
    return {"text": text}

formatted = [format_example(ex) for ex in raw_data]
dataset   = Dataset.from_list(formatted)
print(f"✅ Dataset formatted: {len(dataset)} examples")

# ── Step 4: Train ─────────────────────────────────────────────
print("\n⚙️  Configuring trainer...")

trainer = SFTTrainer(
    model        = model,
    tokenizer    = tokenizer,
    train_dataset= dataset,
    dataset_text_field = "text",
    max_seq_length     = MAX_SEQ_LEN,

    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        num_train_epochs            = EPOCHS,
        warmup_steps                = 10,
        learning_rate               = 2e-4,
        weight_decay                = 0.01,
        fp16                        = True,
        optim                       = "paged_adamw_8bit",
        logging_steps               = 5,
        output_dir                  = OUTPUT_DIR,
        save_strategy               = "epoch",
        seed                        = 42,
        report_to                   = "none",
        gradient_checkpointing      = True,
    ),
)

steps = len(dataset) * EPOCHS // 8
print(f"✅ Trainer configured — est. {steps} steps, ~25-40 mins on RTX 4050\n")

print("=" * 60)
print("🚀 Starting training — watch the loss decrease!")
print("=" * 60 + "\n")

start_time    = time.time()
trainer_stats = trainer.train()
elapsed       = time.time() - start_time

print("\n" + "=" * 60)
print(f"✅ Training complete!")
print(f"   Time:       {elapsed/60:.1f} minutes")
print(f"   Final loss: {trainer_stats.training_loss:.4f}")
print("=" * 60)

# ── Step 5: Save the LoRA adapter ────────────────────────────
print("\n💾 Saving LoRA adapter weights...")
model.save_pretrained("fitx-lora-adapter")
tokenizer.save_pretrained("fitx-lora-adapter")
print("✅ Adapter saved to fitx-lora-adapter/")

# ── Step 6: Quick test ────────────────────────────────────────
print("\n🧪 Testing fine-tuned model...")
model.eval()

def ask(question):
    prompt = PROMPT_TEMPLATE.format(instruction=question, response="")
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens = 150,
            temperature    = 0.7,
            top_p          = 0.9,
            do_sample      = True,
            pad_token_id   = tokenizer.eos_token_id,
        )
    return tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True
    ).strip()

test_questions = [
    "How much protein do I need to build muscle?",
    "What is the correct form for a squat?",
    "I only have 20 minutes to work out, what should I do?",
]

print("\n" + "─" * 60)
for q in test_questions:
    print(f"\n❓ {q}")
    print(f"💪 {ask(q)}")
    print("─" * 60)

print("\n" + "=" * 60)
print("🎉 Done! Your FitX AI adapter is saved to fitx-lora-adapter/")
print("=" * 60)
print("\nNext step: Install Ollama to run the model locally.")
print("  1. Go to https://ollama.com and install it")
print("  2. We will merge and export the model next")
