import { prisma } from '../config/prisma.js';

export async function createOption(req, res) {
  const option = await prisma.option.create({
    data: req.body
  });

  res.status(201).json({ option });
}

export async function deleteOption(req, res) {
  await prisma.option.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Option deleted successfully.' });
}
