'use client';

import { useParams } from 'next/navigation';
import { EditorLayout } from '@/components/editor/editor-layout';

export default function ModelEditorPage() {
  const params = useParams();
  const projectId = params.id as string;
  const modelId = params.mid as string;

  return <EditorLayout projectId={projectId} modelId={modelId} />;
}
