import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

// GET: 모든 로그 조회
export async function GET() {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 새로운 로그 생성
export async function POST(request: Request) {
  const { year, month, parts } = await request.json();
  const { error } = await supabase
    .from('workouts')
    .insert([{ year, month, parts }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Log created' }, { status: 201 });
}

// PUT: 특정 로그 수정
export async function PUT(request: Request) {
  const { id, parts } = await request.json();
  const { error } = await supabase
    .from('workouts')
    .update({ parts })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Log updated' });
}

// DELETE: 특정 로그 삭제
export async function DELETE(request: Request) {
  const { id } = await request.json();
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Log deleted' });
}
